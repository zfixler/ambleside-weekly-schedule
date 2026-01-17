import { autoSizeTextareasInTab, autoSizeTextareasInActiveTab } from '../utils/dom.js';

/**
 * Prepares a tab for printing by sizing textareas appropriately.
 * @param {string} tabId
 * @param {Function} persistFn - Function to persist tab data before print
 */
export function preparePrint(tabId, persistFn) {
    // Persist current state
    if (persistFn) {
        persistFn(tabId, { silent: true });
    }

    // Size textareas
    autoSizeTextareasInTab(tabId);

    // Run once more on the next frame to ensure layout has settled
    requestAnimationFrame(() => {
        autoSizeTextareasInTab(tabId);
        window.print();
    });
}

/**
 * Sets up print event handlers for textarea auto-sizing.
 */
export function setupPrintHandlers() {
    // When print media rules apply, textarea wrapping can change; re-measure heights.
    window.addEventListener('beforeprint', () => {
        autoSizeTextareasInActiveTab();
    });

    // Some browsers are more reliable with matchMedia("print") than beforeprint.
    const printMediaQuery = window.matchMedia?.('print');
    if (printMediaQuery?.addEventListener) {
        printMediaQuery.addEventListener('change', (e) => {
            if (e.matches) autoSizeTextareasInActiveTab();
        });
    } else if (printMediaQuery?.addListener) {
        // Deprecated, but still used in older browsers.
        printMediaQuery.addListener((mql) => {
            if (mql.matches) autoSizeTextareasInActiveTab();
        });
    }
}
