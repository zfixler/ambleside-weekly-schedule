export { StorageBackend } from './interface.js';
export { LocalStorageBackend, TAB_LIST_KEY, TAB_DATA_PREFIX } from './localStorage.js';
export { IndexedDBBackend, DB_NAME, DB_VERSION, STORES } from './indexedDB.js';
export { StorageMigration, getStorageBackend, MIGRATION_FLAG_KEY } from './migration.js';
