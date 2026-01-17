import { LocalStorageBackend } from './localStorage.js';
import { IndexedDBBackend } from './indexedDB.js';

const MIGRATION_FLAG_KEY = 'ambleside_migrated_to_idb';

/**
 * Handles migration from localStorage to IndexedDB.
 * Preserves backward compatibility by keeping localStorage data intact
 * until migration is confirmed successful.
 */
export class StorageMigration {
    constructor() {
        this.localStorage = new LocalStorageBackend();
        this.indexedDB = new IndexedDBBackend();
    }

    /**
     * Check if migration has already been completed.
     * @returns {boolean}
     */
    isMigrationComplete() {
        return localStorage.getItem(MIGRATION_FLAG_KEY) === 'true';
    }

    /**
     * Check if there's legacy data that needs migration.
     * @returns {Promise<boolean>}
     */
    async needsMigration() {
        if (this.isMigrationComplete()) {
            return false;
        }

        const hasLocalStorageData = await this.localStorage.hasData();
        const hasIndexedDBData = await this.indexedDB.hasData();

        // Need migration if localStorage has data but IndexedDB doesn't
        return hasLocalStorageData && !hasIndexedDBData;
    }

    /**
     * Perform migration from localStorage to IndexedDB.
     * @returns {Promise<{success: boolean, error?: string, count?: number}>}
     */
    async migrate() {
        try {
            // Check if migration is needed
            if (this.isMigrationComplete()) {
                return { success: true, count: 0 };
            }

            // Initialize IndexedDB
            await this.indexedDB.init();

            // Check if IndexedDB already has data
            const hasIdbData = await this.indexedDB.hasData();
            if (hasIdbData) {
                // IndexedDB already has data, mark as migrated
                this._markMigrationComplete();
                return { success: true, count: 0 };
            }

            // Check if localStorage has data to migrate
            const hasLsData = await this.localStorage.hasData();
            if (!hasLsData) {
                // No data to migrate
                this._markMigrationComplete();
                return { success: true, count: 0 };
            }

            // Export from localStorage
            const exportData = await this.localStorage.exportAll();

            // Import to IndexedDB
            await this.indexedDB.importAll(exportData);

            // Verify migration
            const migratedStudents = await this.indexedDB.getStudents();
            const originalStudents = await this.localStorage.getStudents();

            if (migratedStudents.length !== originalStudents.length) {
                throw new Error('Migration verification failed: student count mismatch');
            }

            // Mark migration complete
            this._markMigrationComplete();

            console.log(`Successfully migrated ${migratedStudents.length} students to IndexedDB`);

            return {
                success: true,
                count: migratedStudents.length
            };
        } catch (error) {
            console.error('Migration failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Clear localStorage data after successful migration (optional).
     * Call this only after confirming the app works with IndexedDB.
     */
    async clearLegacyData() {
        if (!this.isMigrationComplete()) {
            throw new Error('Cannot clear legacy data before migration is complete');
        }

        const students = await this.localStorage.getStudents();
        for (const student of students) {
            await this.localStorage.deleteStudent(student.storageKey);
        }

        console.log('Legacy localStorage data cleared');
    }

    _markMigrationComplete() {
        localStorage.setItem(MIGRATION_FLAG_KEY, 'true');
    }
}

/**
 * Get the appropriate storage backend, handling migration if needed.
 * @returns {Promise<StorageBackend>}
 */
export async function getStorageBackend() {
    const migration = new StorageMigration();
    const indexedDB = new IndexedDBBackend();
    const localStorage = new LocalStorageBackend();

    // Check if IndexedDB is available
    const idbAvailable = await indexedDB.isAvailable();

    if (!idbAvailable) {
        console.log('IndexedDB not available, using localStorage');
        return localStorage;
    }

    // Initialize IndexedDB
    await indexedDB.init();

    // Perform migration if needed
    if (await migration.needsMigration()) {
        console.log('Migrating data from localStorage to IndexedDB...');
        const result = await migration.migrate();

        if (!result.success) {
            console.warn('Migration failed, falling back to localStorage:', result.error);
            return localStorage;
        }
    }

    return indexedDB;
}

export { MIGRATION_FLAG_KEY };
