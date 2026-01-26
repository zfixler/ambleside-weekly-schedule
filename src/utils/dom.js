/**
 * DOM utility functions.
 */

/**
 * Creates a slug from a title string.
 * @param {string} title
 * @returns {string}
 */
export function slugifyTitle(title) {
    return String(title || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 40) || 'tab';
}

/**
 * Auto-sizes a textarea to fit its content.
 * @param {HTMLTextAreaElement} textarea
 */
export function autoSizeTextarea(textarea) {
    if (!textarea) return;
    // Set rows to 1 to ensure single-line textareas don't show extra rows
    textarea.rows = 1;
    // Reset height to auto, then set to scrollHeight. Add a buffer to avoid
    // sub-pixel rounding causing the last line to be clipped (common in print).
    textarea.style.height = 'auto';
    textarea.style.overflowY = 'hidden';
    // Force a reflow to ensure scrollHeight is accurate
    void textarea.offsetHeight;
    const extra = 1;
    const newHeight = textarea.scrollHeight + extra;
    textarea.style.height = `${newHeight}px`;
}

/**
 * Auto-sizes all textareas within a container.
 * @param {HTMLElement} container
 */
export function autoSizeTextareasInContainer(container) {
    if (!container) return;
    container.querySelectorAll('textarea').forEach(t => autoSizeTextarea(t));
}

/**
 * Auto-sizes all textareas in a specific tab pane.
 * @param {string} tabId
 */
export function autoSizeTextareasInTab(tabId) {
    const pane = document.getElementById(tabId);
    if (!pane) return;
    autoSizeTextareasInContainer(pane);
}

/**
 * Auto-sizes all textareas in the currently active tab.
 */
export function autoSizeTextareasInActiveTab() {
    const pane = document.querySelector('.tab-pane.active') || document.getElementById('tab1');
    autoSizeTextareasInContainer(pane);
}

/**
 * Creates an element with attributes and children.
 * @param {string} tag - HTML tag name
 * @param {Object} attrs - Attributes to set
 * @param {(string|Node)[]} children - Child elements or text
 * @returns {HTMLElement}
 */
export function createElement(tag, attrs = {}, children = []) {
    const el = document.createElement(tag);

    for (const [key, value] of Object.entries(attrs)) {
        if (key === 'className') {
            el.className = value;
        } else if (key === 'style' && typeof value === 'object') {
            Object.assign(el.style, value);
        } else if (key.startsWith('on') && typeof value === 'function') {
            const eventName = key.slice(2).toLowerCase();
            el.addEventListener(eventName, value);
        } else if (key === 'dataset' && typeof value === 'object') {
            Object.assign(el.dataset, value);
        } else {
            el.setAttribute(key, value);
        }
    }

    for (const child of children) {
        if (typeof child === 'string') {
            el.appendChild(document.createTextNode(child));
        } else if (child instanceof Node) {
            el.appendChild(child);
        }
    }

    return el;
}

/**
 * Gets the tab button for a given tab ID.
 * @param {string} tabId
 * @returns {HTMLButtonElement|null}
 */
export function getTabButton(tabId) {
    return document.querySelector(`.tab-button[data-tab="${tabId}"]`);
}

/**
 * Gets the storage key from a tab button.
 * @param {string} tabId
 * @returns {string}
 */
export function getTabStorageKey(tabId) {
    return getTabButton(tabId)?.dataset.storageKey || '';
}

/**
 * Gets the title from a tab button.
 * @param {string} tabId
 * @returns {string}
 */
export function getTabTitle(tabId) {
    return getTabButton(tabId)?.dataset.title || '';
}

/**
 * Gets the default tab title based on tab ID.
 * @param {string} tabId
 * @returns {string}
 */
export function getDefaultTabTitle(tabId) {
    const num = Number(String(tabId || '').replace('tab', ''));
    return Number.isFinite(num) && num > 0 ? `Form ${num}` : 'Form';
}
