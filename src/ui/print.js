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

    // Mark empty rows for hiding
    markEmptyRows(tabId);

    // Size textareas multiple times to ensure proper height calculation
    autoSizeTextareasInTab(tabId);

    // Run multiple times to ensure layout has settled and fonts have loaded
    requestAnimationFrame(() => {
        autoSizeTextareasInTab(tabId);
        requestAnimationFrame(() => {
            autoSizeTextareasInTab(tabId);
            setTimeout(() => {
                autoSizeTextareasInTab(tabId);
                window.print();
            }, 50);
        });
    });
}

/**
 * Marks empty rows in readings and subjects tables with the empty-row class.
 * @param {string} tabId
 */
export function markEmptyRows(tabId) {
    const tabPane = document.getElementById(tabId);
    if (!tabPane) return;

    // Mark empty reading rows
    tabPane.querySelectorAll('.readings-table tbody tr').forEach(row => {
        const textarea = row.querySelector('textarea');
        const isEmpty = !textarea || textarea.value.trim() === '';
        if (isEmpty) {
            row.classList.add('empty-row');
        } else {
            row.classList.remove('empty-row');
        }
    });

    // Mark empty subject rows
    tabPane.querySelectorAll('.subjects-table tbody tr').forEach(row => {
        const input = row.querySelector('input[type="text"]');
        const isEmpty = !input || input.value.trim() === '';
        if (isEmpty) {
            row.classList.add('empty-row');
        } else {
            row.classList.remove('empty-row');
        }
    });
}

/**
 * Sets up print event handlers for textarea auto-sizing.
 */
export function setupPrintHandlers() {
    // When print media rules apply, textarea wrapping can change; re-measure heights.
    window.addEventListener('beforeprint', () => {
        const activeTabElement = document.querySelector('.tab-pane.active');
        if (activeTabElement) {
            markEmptyRows(activeTabElement.id);
        }
        autoSizeTextareasInActiveTab();
    });

    // Some browsers are more reliable with matchMedia("print") than beforeprint.
    const printMediaQuery = window.matchMedia?.('print');
    if (printMediaQuery?.addEventListener) {
        printMediaQuery.addEventListener('change', (e) => {
            if (e.matches) {
                const activeTabElement = document.querySelector('.tab-pane.active');
                if (activeTabElement) {
                    markEmptyRows(activeTabElement.id);
                }
                autoSizeTextareasInActiveTab();
            }
        });
    } else if (printMediaQuery?.addListener) {
        // Deprecated, but still used in older browsers.
        printMediaQuery.addListener((mql) => {
            if (mql.matches) {
                const activeTabElement = document.querySelector('.tab-pane.active');
                if (activeTabElement) {
                    markEmptyRows(activeTabElement.id);
                }
                autoSizeTextareasInActiveTab();
            }
        });
    }
}
