import { StorageBackend } from './interface.js';

const DB_NAME = 'ambleside_weekly';
const DB_VERSION = 1;

const STORES = {
    STUDENTS: 'students',
    SCHEDULES: 'schedules'
};

/**
 * IndexedDB-based storage backend.
 * Provides transaction support and larger storage quota.
 */
export class IndexedDBBackend extends StorageBackend {
    constructor() {
        super();
        this.db = null;
    }

    async init() {
        if (this.db) return;

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => {
                reject(new Error('Failed to open IndexedDB'));
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Students store
                if (!db.objectStoreNames.contains(STORES.STUDENTS)) {
                    const studentsStore = db.createObjectStore(STORES.STUDENTS, {
                        keyPath: 'storageKey'
                    });
                    studentsStore.createIndex('displayOrder', 'displayOrder', { unique: false });
                }

                // Schedules store (tab data)
                if (!db.objectStoreNames.contains(STORES.SCHEDULES)) {
                    const schedulesStore = db.createObjectStore(STORES.SCHEDULES, {
                        keyPath: 'storageKey'
                    });
                    schedulesStore.createIndex('year', 'year', { unique: false });
                    schedulesStore.createIndex('week', 'week', { unique: false });
                }
            };
        });
    }

    async isAvailable() {
        try {
            if (!window.indexedDB) return false;

            // Try to open a test database
            return new Promise((resolve) => {
                const request = indexedDB.open('__test_db__');
                request.onsuccess = () => {
                    request.result.close();
                    indexedDB.deleteDatabase('__test_db__');
                    resolve(true);
                };
                request.onerror = () => resolve(false);
            });
        } catch {
            return false;
        }
    }

    async getStudents() {
        await this._ensureDb();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORES.STUDENTS], 'readonly');
            const store = transaction.objectStore(STORES.STUDENTS);
            const request = store.getAll();

            request.onsuccess = () => {
                const students = request.result || [];
                // Sort by displayOrder
                students.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
                resolve(students);
            };

            request.onerror = () => reject(new Error('Failed to get students'));
        });
    }

    async getStudentByKey(storageKey) {
        await this._ensureDb();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORES.STUDENTS], 'readonly');
            const store = transaction.objectStore(STORES.STUDENTS);
            const request = store.get(storageKey);

            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(new Error('Failed to get student'));
        });
    }

    async saveStudent(student) {
        await this._ensureDb();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORES.STUDENTS], 'readwrite');
            const store = transaction.objectStore(STORES.STUDENTS);

            const data = {
                id: student.id || student.storageKey,
                name: student.name,
                storageKey: student.storageKey,
                displayOrder: student.displayOrder || 0,
                createdAt: student.createdAt || Date.now()
            };

            const request = store.put(data);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(new Error('Failed to save student'));
        });
    }

    async deleteStudent(storageKey) {
        await this._ensureDb();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(
                [STORES.STUDENTS, STORES.SCHEDULES],
                'readwrite'
            );

            const studentsStore = transaction.objectStore(STORES.STUDENTS);
            const schedulesStore = transaction.objectStore(STORES.SCHEDULES);

            // Delete student
            studentsStore.delete(storageKey);

            // Delete associated schedule
            schedulesStore.delete(storageKey);

            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(new Error('Failed to delete student'));
        });
    }

    async getSchedule(storageKey, year, week) {
        const data = await this.getTabData(storageKey);
        if (!data) return null;

        if (Number(data.year) === Number(year) && Number(data.week) === Number(week)) {
            return {
                id: `${storageKey}-${year}-${week}`,
                studentId: storageKey,
                year: Number(year),
                week: Number(week),
                notes: data.notes || '',
                subjects: data.subjects || [],
                removedIndices: data.removedIndices || [],
                customReadings: data.customReadings || [],
                updatedAt: data.updatedAt || Date.now()
            };
        }

        return null;
    }

    async getTabData(storageKey) {
        await this._ensureDb();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORES.SCHEDULES], 'readonly');
            const store = transaction.objectStore(STORES.SCHEDULES);
            const request = store.get(storageKey);

            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(new Error('Failed to get tab data'));
        });
    }

    async saveTabData(storageKey, data) {
        await this._ensureDb();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(
                [STORES.SCHEDULES, STORES.STUDENTS],
                'readwrite'
            );

            const schedulesStore = transaction.objectStore(STORES.SCHEDULES);
            const studentsStore = transaction.objectStore(STORES.STUDENTS);

            // Save schedule data
            const scheduleData = {
                ...data,
                storageKey,
                updatedAt: Date.now()
            };
            schedulesStore.put(scheduleData);

            // Update student title if provided
            if (data.title) {
                const getRequest = studentsStore.get(storageKey);
                getRequest.onsuccess = () => {
                    const existing = getRequest.result;
                    if (existing) {
                        existing.name = data.title;
                        studentsStore.put(existing);
                    }
                };
            }

            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(new Error('Failed to save tab data'));
        });
    }

    async exportAll() {
        await this._ensureDb();

        const students = await this.getStudents();
        const tabs = {};

        for (const student of students) {
            const data = await this.getTabData(student.storageKey);
            if (data) {
                tabs[student.storageKey] = data;
            }
        }

        return {
            version: 1,
            exportedAt: new Date().toISOString(),
            source: 'indexedDB',
            students,
            tabs
        };
    }

    async importAll(data) {
        if (!data || !data.students) {
            throw new Error('Invalid import data');
        }

        await this._ensureDb();

        // Clear existing data
        await this._clearAll();

        // Import students and their data
        for (let i = 0; i < data.students.length; i++) {
            const student = data.students[i];
            await this.saveStudent({
                ...student,
                displayOrder: i
            });

            if (data.tabs && data.tabs[student.storageKey]) {
                await this.saveTabData(student.storageKey, data.tabs[student.storageKey]);
            }
        }
    }

    async hasData() {
        await this._ensureDb();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORES.STUDENTS], 'readonly');
            const store = transaction.objectStore(STORES.STUDENTS);
            const request = store.count();

            request.onsuccess = () => resolve(request.result > 0);
            request.onerror = () => reject(new Error('Failed to check data'));
        });
    }

    // Private helpers

    async _ensureDb() {
        if (!this.db) {
            await this.init();
        }
    }

    async _clearAll() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(
                [STORES.STUDENTS, STORES.SCHEDULES],
                'readwrite'
            );

            transaction.objectStore(STORES.STUDENTS).clear();
            transaction.objectStore(STORES.SCHEDULES).clear();

            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(new Error('Failed to clear data'));
        });
    }
}

export { DB_NAME, DB_VERSION, STORES };
