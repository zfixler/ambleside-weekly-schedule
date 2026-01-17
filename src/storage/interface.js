/**
 * Storage interface contract.
 * All methods return Promises for consistent async handling across backends.
 *
 * Data structures:
 * - Student: { id, name, storageKey, displayOrder, createdAt }
 * - Schedule: { id, studentId, year, week, notes, subjects, removedIndices, customReadings, updatedAt }
 */

/**
 * @typedef {Object} Student
 * @property {string} id - Unique identifier
 * @property {string} name - Student display name
 * @property {string} storageKey - Key used for storage lookups
 * @property {number} displayOrder - Order in tab list
 * @property {number} createdAt - Timestamp of creation
 */

/**
 * @typedef {Object} Subject
 * @property {string} name - Subject name
 * @property {Object.<string, boolean>} days - Day completion map (M, T, W, Th, F)
 */

/**
 * @typedef {Object} Schedule
 * @property {string} id - Unique identifier
 * @property {string} studentId - Reference to student
 * @property {number} year - Ambleside year
 * @property {number} week - Week number
 * @property {string} notes - Notes content
 * @property {Subject[]} subjects - Array of subject entries
 * @property {number[]} removedIndices - Indices of removed default readings
 * @property {string[]} customReadings - Custom reading entries
 * @property {number} updatedAt - Last update timestamp
 */

/**
 * Storage interface that all backends must implement.
 * @interface StorageBackend
 */
export class StorageBackend {
    /**
     * Initialize the storage backend.
     * @returns {Promise<void>}
     */
    async init() {
        throw new Error('Not implemented');
    }

    /**
     * Check if backend is available and functional.
     * @returns {Promise<boolean>}
     */
    async isAvailable() {
        throw new Error('Not implemented');
    }

    /**
     * Get all students.
     * @returns {Promise<Student[]>}
     */
    async getStudents() {
        throw new Error('Not implemented');
    }

    /**
     * Get a student by storage key.
     * @param {string} storageKey
     * @returns {Promise<Student|null>}
     */
    async getStudentByKey(storageKey) {
        throw new Error('Not implemented');
    }

    /**
     * Save a student (create or update).
     * @param {Student} student
     * @returns {Promise<void>}
     */
    async saveStudent(student) {
        throw new Error('Not implemented');
    }

    /**
     * Delete a student and their schedules.
     * @param {string} storageKey
     * @returns {Promise<void>}
     */
    async deleteStudent(storageKey) {
        throw new Error('Not implemented');
    }

    /**
     * Get a schedule for a student/year/week.
     * @param {string} storageKey - Student's storage key
     * @param {number} year
     * @param {number} week
     * @returns {Promise<Schedule|null>}
     */
    async getSchedule(storageKey, year, week) {
        throw new Error('Not implemented');
    }

    /**
     * Get all schedule data for a student (current week).
     * @param {string} storageKey
     * @returns {Promise<Object|null>}
     */
    async getTabData(storageKey) {
        throw new Error('Not implemented');
    }

    /**
     * Save schedule/tab data.
     * @param {string} storageKey
     * @param {Object} data
     * @returns {Promise<void>}
     */
    async saveTabData(storageKey, data) {
        throw new Error('Not implemented');
    }

    /**
     * Export all data for backup.
     * @returns {Promise<Object>}
     */
    async exportAll() {
        throw new Error('Not implemented');
    }

    /**
     * Import data from backup.
     * @param {Object} data
     * @returns {Promise<void>}
     */
    async importAll(data) {
        throw new Error('Not implemented');
    }

    /**
     * Check if there's any data stored.
     * @returns {Promise<boolean>}
     */
    async hasData() {
        throw new Error('Not implemented');
    }
}
