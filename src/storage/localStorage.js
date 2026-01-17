import { StorageBackend } from './interface.js';

const TAB_LIST_KEY = 'ambleside_tabs_v1';
const TAB_DATA_PREFIX = 'ambleside_tab_v1:';

/**
 * localStorage-based storage backend.
 * Provides backward compatibility with existing data format.
 */
export class LocalStorageBackend extends StorageBackend {
    async init() {
        // localStorage doesn't need initialization
    }

    async isAvailable() {
        try {
            const testKey = '__storage_test__';
            localStorage.setItem(testKey, testKey);
            localStorage.removeItem(testKey);
            return true;
        } catch {
            return false;
        }
    }

    async getStudents() {
        const list = localStorage.getItem(TAB_LIST_KEY);
        if (!list) return [];
        try {
            const parsed = JSON.parse(list);
            if (!Array.isArray(parsed)) return [];
            return parsed.map((t, index) => ({
                id: t.storageKey,
                name: t.title,
                storageKey: t.storageKey,
                displayOrder: index,
                createdAt: Date.now()
            }));
        } catch {
            return [];
        }
    }

    async getStudentByKey(storageKey) {
        const students = await this.getStudents();
        return students.find(s => s.storageKey === storageKey) || null;
    }

    async saveStudent(student) {
        const list = await this._getTabList();
        const idx = list.findIndex(t => t.storageKey === student.storageKey);
        const entry = { title: student.name, storageKey: student.storageKey };

        if (idx >= 0) {
            list[idx] = entry;
        } else {
            list.push(entry);
        }

        this._setTabList(list);
    }

    async deleteStudent(storageKey) {
        // Remove from tab list
        const list = await this._getTabList();
        const filtered = list.filter(t => t.storageKey !== storageKey);
        this._setTabList(filtered);

        // Remove tab data
        localStorage.removeItem(`${TAB_DATA_PREFIX}${storageKey}`);
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
                updatedAt: Date.now()
            };
        }

        return null;
    }

    async getTabData(storageKey) {
        const data = localStorage.getItem(`${TAB_DATA_PREFIX}${storageKey}`);
        if (!data) return null;
        try {
            return JSON.parse(data);
        } catch {
            return null;
        }
    }

    async saveTabData(storageKey, data) {
        localStorage.setItem(`${TAB_DATA_PREFIX}${storageKey}`, JSON.stringify(data));

        // Also update the tab list entry
        if (data.title) {
            const list = await this._getTabList();
            const idx = list.findIndex(t => t.storageKey === storageKey);
            if (idx >= 0) {
                list[idx] = { ...list[idx], title: data.title };
            } else {
                list.push({ title: data.title, storageKey });
            }
            this._setTabList(list);
        }
    }

    async exportAll() {
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
            students,
            tabs
        };
    }

    async importAll(data) {
        if (!data || !data.students) {
            throw new Error('Invalid import data');
        }

        // Clear existing data
        const existingStudents = await this.getStudents();
        for (const student of existingStudents) {
            await this.deleteStudent(student.storageKey);
        }

        // Import new data
        for (const student of data.students) {
            await this.saveStudent(student);
            if (data.tabs && data.tabs[student.storageKey]) {
                await this.saveTabData(student.storageKey, data.tabs[student.storageKey]);
            }
        }
    }

    async hasData() {
        const students = await this.getStudents();
        return students.length > 0;
    }

    // Private helpers (prefixed with underscore)

    async _getTabList() {
        const list = localStorage.getItem(TAB_LIST_KEY);
        if (!list) return [];
        try {
            const parsed = JSON.parse(list);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }

    _setTabList(tabs) {
        localStorage.setItem(TAB_LIST_KEY, JSON.stringify(tabs));
    }
}

// Export constants for direct use if needed
export { TAB_LIST_KEY, TAB_DATA_PREFIX };
