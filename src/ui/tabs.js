import { slugifyTitle, getTabButton, getTabStorageKey, getTabTitle, getDefaultTabTitle } from '../utils/dom.js';

/**
 * Tab management state.
 */
let tabCounter = 1;
let activeTab = 'tab1';

export function getTabCounter() {
    return tabCounter;
}

export function setTabCounter(value) {
    tabCounter = value;
}

export function incrementTabCounter() {
    return ++tabCounter;
}

export function getActiveTab() {
    return activeTab;
}

export function setActiveTab(tabId) {
    activeTab = tabId;
}

/**
 * Generates a unique storage key based on a base string.
 * @param {string} base
 * @param {Set<string>} existing - Set of existing keys
 * @returns {string}
 */
export function uniqueStorageKey(base, existing) {
    let candidate = base;
    let i = 2;
    while (existing.has(candidate)) {
        candidate = `${base}-${i}`;
        i++;
    }
    return candidate;
}

/**
 * Rebuilds a tab button with updated title and storage key.
 * @param {string} tabId
 * @param {string} title
 * @param {string} storageKey
 * @param {Function} closeTabFn
 */
export function rebuildTabButton(tabId, title, storageKey, closeTabFn) {
    const btn = getTabButton(tabId);
    if (!btn) return;

    btn.textContent = title;
    btn.dataset.title = title;
    btn.dataset.storageKey = storageKey;

    const closeBtn = document.createElement('span');
    closeBtn.textContent = ' ×';
    closeBtn.style.cursor = 'pointer';
    closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeTabFn(tabId);
    });
    btn.appendChild(closeBtn);
}

/**
 * Syncs the tab title from the student name input.
 * @param {string} tabId
 * @param {Object} options
 * @param {Function} options.persistFn
 * @param {Function} options.updateTabListFn
 */
export function syncTabTitleFromStudentName(tabId, { persistFn, updateTabListFn } = {}) {
    const btn = getTabButton(tabId);
    if (!btn) return;

    const num = String(tabId || '').replace('tab', '');
    const studentName = (document.getElementById(`student-name-${num}`)?.value || '').trim();
    const storageKey = getTabStorageKey(tabId);
    if (!storageKey) return;

    const nextTitle = studentName || getDefaultTabTitle(tabId);
    if (nextTitle !== getTabTitle(tabId)) {
        btn.textContent = nextTitle;
        btn.dataset.title = nextTitle;

        // Re-add close button
        const closeBtn = document.createElement('span');
        closeBtn.textContent = ' ×';
        closeBtn.style.cursor = 'pointer';
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            // Close will be handled by the parent module
        });
        btn.appendChild(closeBtn);

        if (updateTabListFn) {
            updateTabListFn(storageKey, nextTitle);
        }
    }

    if (persistFn) {
        persistFn(tabId, { silent: true });
    }
}

/**
 * Clears all tab UI elements.
 */
export function clearTabUi() {
    document.querySelectorAll('.tab-pane').forEach(p => p.remove());
    document.querySelectorAll('.tab-button').forEach(b => b.remove());
}

/**
 * Creates the HTML structure for a tab pane.
 * @param {number} num - Tab number
 * @returns {HTMLDivElement}
 */
export function createTabPaneStructure(num) {
    const tabPane = document.createElement('div');
    tabPane.id = `tab${num}`;
    tabPane.className = 'tab-pane';

    const formContainer = document.createElement('div');
    formContainer.className = 'form-container';

    const h1 = document.createElement('h1');
    h1.textContent = 'Ambleside Weekly Schedule';
    formContainer.appendChild(h1);

    const form = document.createElement('form');
    form.className = 'weekly-form';

    // Student name and year in same form-group
    const nameYearGroup = document.createElement('div');
    nameYearGroup.className = 'form-group';

    const nameSubGroup = document.createElement('div');
    nameSubGroup.className = 'form-group';

    const nameLabel = document.createElement('label');
    nameLabel.setAttribute('for', `student-name-${num}`);
    nameLabel.textContent = 'Student Name:';
    nameSubGroup.appendChild(nameLabel);

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.id = `student-name-${num}`;
    nameInput.required = true;
    nameSubGroup.appendChild(nameInput);

    nameYearGroup.appendChild(nameSubGroup);

    const yearLabel = document.createElement('label');
    yearLabel.setAttribute('for', `year-${num}`);
    yearLabel.textContent = 'Year:';
    nameYearGroup.appendChild(yearLabel);

    const yearInput = document.createElement('input');
    yearInput.type = 'number';
    yearInput.id = `year-${num}`;
    yearInput.min = '1';
    yearInput.required = true;
    nameYearGroup.appendChild(yearInput);

    form.appendChild(nameYearGroup);

    // Week form-group
    const weekGroup = document.createElement('div');
    weekGroup.className = 'form-group';

    const weekLabel = document.createElement('label');
    weekLabel.setAttribute('for', `week-${num}`);
    weekLabel.textContent = 'Week:';
    weekGroup.appendChild(weekLabel);

    const weekInput = document.createElement('input');
    weekInput.type = 'number';
    weekInput.id = `week-${num}`;
    weekInput.min = '1';
    weekInput.max = '36';
    weekInput.required = true;
    weekGroup.appendChild(weekInput);

    form.appendChild(weekGroup);

    // Load readings button
    const loadButton = document.createElement('button');
    loadButton.type = 'button';
    loadButton.className = 'load-readings';
    loadButton.textContent = 'Load Readings';
    form.appendChild(loadButton);

    // Readings container
    const readingsContainer = document.createElement('div');
    readingsContainer.className = 'readings-container';
    form.appendChild(readingsContainer);

    // Print form button
    const printButton = document.createElement('button');
    printButton.type = 'button';
    printButton.className = 'print-form';
    printButton.textContent = 'Print Form';
    form.appendChild(printButton);

    formContainer.appendChild(form);
    tabPane.appendChild(formContainer);

    return tabPane;
}

// Re-export for convenience
export { slugifyTitle, getTabButton, getTabStorageKey, getTabTitle, getDefaultTabTitle };
