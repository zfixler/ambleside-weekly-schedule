export { preparePrint, setupPrintHandlers } from './print.js';
export { createReadingsTable, createNotesSection } from './readings.js';
export { createSubjectsTable, setupSubjectsListeners, captureSubjectsState, applySubjectsState } from './subjects.js';
export {
    getTabCounter,
    setTabCounter,
    incrementTabCounter,
    getActiveTab,
    setActiveTab,
    uniqueStorageKey,
    rebuildTabButton,
    syncTabTitleFromStudentName,
    clearTabUi,
    createTabPaneStructure,
    slugifyTitle,
    getTabButton,
    getTabStorageKey,
    getTabTitle,
    getDefaultTabTitle
} from './tabs.js';
