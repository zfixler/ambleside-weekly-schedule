/**
 * Ambleside Weekly Schedule - Main Application
 *
 * A single-page web application for generating weekly homeschool reading schedules
 * based on the Ambleside Online curriculum.
 */

import { getStorageBackend, LocalStorageBackend, TAB_LIST_KEY, TAB_DATA_PREFIX } from './storage/index.js';
import { DebounceManager } from './utils/debounce.js';
import {
    autoSizeTextarea,
    autoSizeTextareasInTab,
    autoSizeTextareasInActiveTab,
    slugifyTitle,
    getTabButton,
    getTabStorageKey,
    getTabTitle,
    getDefaultTabTitle
} from './utils/dom.js';
import { createReadingsTable, createNotesSection } from './ui/readings.js';
import { createSubjectsTable, setupSubjectsListeners, applySubjectsState } from './ui/subjects.js';
import { createTabPaneStructure, clearTabUi } from './ui/tabs.js';
import { preparePrint, setupPrintHandlers } from './ui/print.js';
import readingLibraryData from '../assets/readingLibrary.json';

// Application state
let readingLibrary = {};
let tabCounter = 1;
let activeTab = 'tab1';
let storage = null;

// Debounce manager for persistence
const persistDebounce = new DebounceManager(300);

/**
 * Gets the current tab list from localStorage (for backward compatibility during migration).
 */
function getTabList() {
    const list = localStorage.getItem(TAB_LIST_KEY);
    if (!list) return [];
    try {
        const parsed = JSON.parse(list);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

/**
 * Sets the tab list in localStorage.
 */
function setTabList(tabs) {
    localStorage.setItem(TAB_LIST_KEY, JSON.stringify(tabs));
}

/**
 * Gets all existing storage keys.
 */
function getAllStorageKeys() {
    return new Set(getTabList().map(t => t.storageKey).filter(Boolean));
}

/**
 * Generates a unique storage key.
 */
function uniqueStorageKey(base) {
    const existing = getAllStorageKeys();
    let candidate = base;
    let i = 2;
    while (existing.has(candidate)) {
        candidate = `${base}-${i}`;
        i++;
    }
    return candidate;
}

/**
 * Updates a tab list entry.
 */
function updateTabListEntry(storageKey, title) {
    const tabs = getTabList();
    const idx = tabs.findIndex(t => t.storageKey === storageKey);
    if (idx >= 0) {
        tabs[idx] = { ...tabs[idx], title };
    } else {
        tabs.push({ title, storageKey });
    }
    setTabList(tabs);
}

/**
 * Removes a tab list entry.
 */
function removeTabListEntry(storageKey) {
    const tabs = getTabList().filter(t => t.storageKey !== storageKey);
    setTabList(tabs);
}

/**
 * Loads the reading library JSON.
 */
function loadReadingLibrary() {
    console.log('Loading reading library...');
    readingLibrary = readingLibraryData;
}

/**
 * Gets readings for a specific year and week.
 */
function getReadings(year, week) {
    const yearNum = parseInt(year, 10);
    const weekNum = parseInt(week, 10);
    const yearKey = `year_${yearNum}`;
    const weekKey = `week_${weekNum}`;
    if (readingLibrary[yearKey] && readingLibrary[yearKey][weekKey]) {
        return readingLibrary[yearKey][weekKey];
    }
    return null;
}

/**
 * Syncs the tab title from the student name input.
 */
function syncTabTitleFromStudentName(tabId, { persist = false } = {}) {
    const btn = getTabButton(tabId);
    if (!btn) return;

    const num = String(tabId || '').replace('tab', '');
    const studentName = (document.getElementById(`student-name-${num}`)?.value || '').trim();
    const storageKey = getTabStorageKey(tabId);
    if (!storageKey) return;

    const nextTitle = studentName || getDefaultTabTitle(tabId);
    if (nextTitle !== getTabTitle(tabId)) {
        rebuildTabButton(tabId, nextTitle, storageKey);
        updateTabListEntry(storageKey, nextTitle);
    }

    if (persist) persistTab(tabId, { silent: true });
}

/**
 * Populates the readings container for a tab.
 */
function populateReadings(year, week, tabId) {
    const container = document.querySelector(`#${tabId} .readings-container`);
    if (!container) {
        console.error(`Readings container not found for tab ${tabId}`);
        return;
    }
    container.innerHTML = '';

    const defaultReadings = getReadings(year, week) || [];
    const storageKey = getTabStorageKey(tabId);
    const data = localStorage.getItem(`${TAB_DATA_PREFIX}${storageKey}`);
    const parsed = data ? JSON.parse(data) : {};
    const isSameWeek = Number(parsed.year) === Number(year) && Number(parsed.week) === Number(week);
    const removed = isSameWeek ? (parsed.removedIndices || []) : [];
    const keptIndices = defaultReadings.map((_, i) => i).filter(i => !removed.includes(i));
    const keptDefault = keptIndices.map(i => defaultReadings[i]);
    const custom = parsed.customReadings || [];
    const allReadings = [...keptDefault, ...custom];

    if (!allReadings.length) {
        container.innerHTML = '<p>No readings found for this year and week.</p>';
        return;
    }

    // Create readings table
    const { readingsTable, addBtn } = createReadingsTable({
        allReadings,
        keptIndices,
        keptDefaultLength: keptDefault.length,
        tabId,
        persistFn: persistTab
    });

    // Create subjects table
    const subjectsTable = createSubjectsTable(tabId, persistTab);

    // Create notes section
    const notesDiv = createNotesSection(tabId, persistTab);

    // Build layout
    const tablesDiv = document.createElement('div');
    tablesDiv.className = 'tables-div';

    // Readings section
    const readingsSection = document.createElement('div');
    readingsSection.className = 'table-section';
    const readingsTitle = document.createElement('h3');
    readingsTitle.textContent = 'Ambleside Readings';
    readingsSection.appendChild(readingsTitle);
    readingsSection.appendChild(readingsTable);
    readingsSection.appendChild(addBtn);
    tablesDiv.appendChild(readingsSection);

    // Subjects section
    const subjectsSection = document.createElement('div');
    subjectsSection.className = 'table-section';
    const subjectsTitle = document.createElement('h3');
    subjectsTitle.textContent = 'This Week';
    subjectsSection.appendChild(subjectsTitle);
    subjectsSection.appendChild(subjectsTable);
    tablesDiv.appendChild(subjectsSection);

    container.appendChild(tablesDiv);
    container.appendChild(notesDiv);

    // Setup event listeners
    setupSubjectsListeners(tabId, persistTab);

    // Auto-size textareas
    document.querySelectorAll(`#${tabId} .readings-table tbody textarea`).forEach(textarea => {
        autoSizeTextarea(textarea);
    });
}

/**
 * Captures the current state of a tab.
 */
function captureTabState(tabId) {
    const pane = document.getElementById(tabId);
    if (!pane) return null;

    const notes = pane.querySelector('.notes-textarea')?.value || '';
    const subjects = [];

    pane.querySelectorAll('.subjects-table tbody tr').forEach(tr => {
        const name = tr.querySelector('input[type="text"]')?.value || '';
        const days = {};
        tr.querySelectorAll('.day-button').forEach(btn => {
            const cell = btn.closest('td');
            days[btn.dataset.day] = !!cell && cell.classList.contains('highlighted');
        });
        subjects.push({ name, days });
    });

    return { notes, subjects };
}

/**
 * Applies saved state to a tab.
 */
function applyTabState(tabId, state) {
    if (!state) return;
    const pane = document.getElementById(tabId);
    if (!pane) return;

    const notesEl = pane.querySelector('.notes-textarea');
    if (notesEl) notesEl.value = state.notes || '';

    applySubjectsState(pane, state.subjects);
}

/**
 * Debounced tab persistence.
 */
function persistTab(tabId, { silent = false } = {}) {
    persistDebounce.schedule(tabId, () => {
        persistTabImmediately(tabId, { silent });
    });
}

/**
 * Immediately persists tab data to storage.
 */
function persistTabImmediately(tabId, { silent = false } = {}) {
    const num = tabId.split('tab')[1];
    const year = document.getElementById(`year-${num}`).value;
    const week = document.getElementById(`week-${num}`).value;
    const studentName = document.getElementById(`student-name-${num}`).value;
    const storageKey = getTabStorageKey(tabId);
    const title = getTabTitle(tabId);

    if (!storageKey) {
        if (!silent) alert('Unable to save: missing tab storage key.');
        return;
    }

    const data = {
        title,
        year,
        week,
        studentName,
        subjects: [],
        notes: document.querySelector(`#${tabId} .notes-textarea`)?.value || '',
        removedIndices: [],
        customReadings: []
    };

    const defaultReadings = getReadings(year, week) || [];
    const allIndices = Array.from({ length: defaultReadings.length }, (_, i) => i);
    const currentDefaultIndices = [];
    document.querySelectorAll(`#${tabId} .readings-table tbody tr[data-type="default"]`).forEach(tr => {
        currentDefaultIndices.push(parseInt(tr.dataset.index));
    });
    data.removedIndices = allIndices.filter(i => !currentDefaultIndices.includes(i));

    document.querySelectorAll(`#${tabId} .readings-table tbody tr[data-type="custom"]`).forEach(tr => {
        const textarea = tr.querySelector('textarea');
        data.customReadings.push(textarea?.value || '');
    });

    document.querySelectorAll(`#${tabId} .subjects-table tbody tr`).forEach(tr => {
        const input = tr.querySelector('input[type="text"]');
        const days = {};
        tr.querySelectorAll('.day-button').forEach(btn => {
            const cell = btn.closest('td');
            days[btn.dataset.day] = !!cell && cell.classList.contains('highlighted');
        });
        data.subjects.push({ name: input?.value || '', days });
    });

    try {
        localStorage.setItem(`${TAB_DATA_PREFIX}${storageKey}`, JSON.stringify(data));
        updateTabListEntry(storageKey, title);
    } catch (error) {
        if (!silent) {
            alert(`Failed to save data: ${error.message}`);
        }
        console.error('Failed to persist tab data:', error);
    }
}

/**
 * Loads saved data into a tab.
 */
function loadTab(tabId) {
    const storageKey = getTabStorageKey(tabId);
    if (!storageKey) return;

    const data = localStorage.getItem(`${TAB_DATA_PREFIX}${storageKey}`);
    if (!data) return;

    const parsed = JSON.parse(data);
    const num = tabId.split('tab')[1];

    document.getElementById(`year-${num}`).value = parsed.year || '';
    document.getElementById(`week-${num}`).value = parsed.week || '';
    document.getElementById(`student-name-${num}`).value = parsed.studentName || '';

    syncTabTitleFromStudentName(tabId);

    if (parsed.year && parsed.week) {
        populateReadings(parsed.year, parsed.week, tabId);
    }

    // Apply saved state directly after populateReadings (which is synchronous)
    const notesEl = document.querySelector(`#${tabId} .notes-textarea`);
    if (notesEl) notesEl.value = parsed.notes || '';

    if (Array.isArray(parsed.subjects)) {
        parsed.subjects.forEach((subj, index) => {
            const tr = document.querySelector(`#${tabId} .subjects-table tbody tr:nth-child(${index + 1})`);
            if (!tr) return;
            const input = tr.querySelector('input[type="text"]');
            if (input) input.value = subj.name || '';
            tr.querySelectorAll('.day-button').forEach(btn => {
                const cell = btn.closest('td');
                if (!cell) return;
                if (subj.days && subj.days[btn.dataset.day]) cell.classList.add('highlighted');
                else cell.classList.remove('highlighted');
            });
        });
    }
}

/**
 * Switches to a different tab.
 */
function switchTab(tabId) {
    if (activeTab && activeTab !== tabId) {
        try {
            persistTabImmediately(activeTab, { silent: true });
        } catch {
            // Best-effort: do not block switching if something is missing.
        }
    }

    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
    document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
    document.getElementById(tabId).classList.add('active');
    activeTab = tabId;

    loadTab(tabId);
    autoSizeTextareasInTab(tabId);
}

/**
 * Rebuilds a tab button with updated title.
 */
function rebuildTabButton(tabId, title, storageKey) {
    const btn = getTabButton(tabId);
    if (!btn) return;

    btn.textContent = title;
    btn.dataset.title = title;
    btn.dataset.storageKey = storageKey;

    const closeBtn = document.createElement('span');
    closeBtn.className = 'tab-close';
    closeBtn.textContent = ' ×';
    closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeTab(tabId);
    });
    btn.appendChild(closeBtn);
}

/**
 * Renames a tab.
 */
function renameTab(tabId) {
    const btn = getTabButton(tabId);
    if (!btn) return;

    const oldTitle = btn.dataset.title || btn.textContent.replace(/\s*×\s*$/, '').trim();
    const oldStorageKey = btn.dataset.storageKey;
    const nextTitle = prompt('Tab name:', oldTitle);
    if (!nextTitle) return;

    const newStorageKey = uniqueStorageKey(slugifyTitle(nextTitle));

    // Migrate data
    if (oldStorageKey) {
        const oldKey = `${TAB_DATA_PREFIX}${oldStorageKey}`;
        const newKey = `${TAB_DATA_PREFIX}${newStorageKey}`;
        const existing = localStorage.getItem(oldKey);
        if (existing) {
            localStorage.setItem(newKey, existing);
            localStorage.removeItem(oldKey);
        }
        removeTabListEntry(oldStorageKey);
    }

    rebuildTabButton(tabId, nextTitle, newStorageKey);
    updateTabListEntry(newStorageKey, nextTitle);
}

/**
 * Creates a new tab.
 */
function createTab(options = {}) {
    tabCounter++;
    const tabId = `tab${tabCounter}`;
    const num = tabCounter;

    const title = options.title || `Form ${num}`;
    const storageKey = options.storageKey || uniqueStorageKey(slugifyTitle(title));

    // Create tab button
    const tabButton = document.createElement('button');
    tabButton.className = 'tab-button';
    tabButton.dataset.tab = tabId;
    tabButton.dataset.title = title;
    tabButton.dataset.storageKey = storageKey;
    tabButton.textContent = title;
    tabButton.addEventListener('click', () => switchTab(tabId));
    tabButton.addEventListener('dblclick', (e) => {
        if (e.target && e.target.nodeName === 'SPAN') return;
        renameTab(tabId);
    });

    // Add close button to tab
    const closeBtn = document.createElement('span');
    closeBtn.className = 'tab-close';
    closeBtn.textContent = ' ×';
    closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeTab(tabId);
    });
    tabButton.appendChild(closeBtn);

    document.querySelector('.tab-buttons').insertBefore(tabButton, document.getElementById('add-tab'));

    // Create tab pane
    const tabPane = createTabPaneStructure(num);
    tabPane.id = tabId;
    document.querySelector('.tab-content').appendChild(tabPane);

    // Get references to the inputs and buttons
    const nameInput = document.getElementById(`student-name-${num}`);
    const yearInput = document.getElementById(`year-${num}`);
    const weekInput = document.getElementById(`week-${num}`);
    const loadButton = tabPane.querySelector('.load-readings');
    const printButton = tabPane.querySelector('.print-form');

    // Add event listeners
    nameInput.addEventListener('input', () => {
        syncTabTitleFromStudentName(tabId);
    });
    nameInput.addEventListener('change', () => {
        syncTabTitleFromStudentName(tabId, { persist: true });
    });
    yearInput.addEventListener('input', () => {
        persistTab(tabId, { silent: true });
    });
    weekInput.addEventListener('input', () => {
        persistTab(tabId, { silent: true });
    });

    loadButton.addEventListener('click', () => {
        const year = yearInput.value;
        const week = weekInput.value;
        if (year && week) {
            // Clear any saved removedIndices for this year/week when explicitly loading
            const sk = getTabStorageKey(tabId);
            if (sk) {
                const data = localStorage.getItem(`${TAB_DATA_PREFIX}${sk}`);
                if (data) {
                    const parsed = JSON.parse(data);
                    if (Number(parsed.year) === Number(year) && Number(parsed.week) === Number(week)) {
                        parsed.removedIndices = [];
                        localStorage.setItem(`${TAB_DATA_PREFIX}${sk}`, JSON.stringify(parsed));
                    }
                }
            }

            const state = captureTabState(tabId);
            populateReadings(year, week, tabId);
            applyTabState(tabId, state);
            persistTabImmediately(tabId, { silent: true });
        } else {
            alert('Please enter year and week.');
        }
    });

    printButton.addEventListener('click', () => {
        preparePrint(tabId, (id) => persistTabImmediately(id, { silent: true }));
    });

    updateTabListEntry(storageKey, title);
    loadTab(tabId);
    syncTabTitleFromStudentName(tabId);
    switchTab(tabId);
}

/**
 * Closes a tab.
 */
function closeTab(tabId) {
    if (document.querySelectorAll('.tab-button').length > 1) {
        const storageKey = getTabStorageKey(tabId);
        document.querySelector(`[data-tab="${tabId}"]`).remove();
        document.getElementById(tabId).remove();

        if (storageKey) {
            localStorage.removeItem(`${TAB_DATA_PREFIX}${storageKey}`);
            removeTabListEntry(storageKey);
        }

        const remaining = document.querySelector('.tab-button');
        if (remaining) switchTab(remaining.dataset.tab);
    }
}

/**
 * Initializes the application.
 */
async function init() {
    // Initialize storage backend (handles migration)
    try {
        storage = await getStorageBackend();
        console.log('Storage backend initialized:', storage.constructor.name);
    } catch (error) {
        console.warn('Failed to initialize preferred storage, falling back to localStorage:', error);
        storage = new LocalStorageBackend();
    }

    loadReadingLibrary();

    document.getElementById('add-tab').addEventListener('click', () => createTab());

    const savedTabs = getTabList();
    if (savedTabs.length > 0) {
        clearTabUi();
        tabCounter = 0;
        for (const t of savedTabs) {
            createTab({ title: t.title || 'Form', storageKey: t.storageKey });
        }
    } else {
        // Wire up the initial scaffolded tab1
        const tabId = 'tab1';
        const btn = getTabButton(tabId) || document.querySelector('.tab-button');
        const title = (btn?.textContent || 'Form 1').replace(/\s*×\s*$/, '').trim();
        const storageKey = uniqueStorageKey(slugifyTitle(title));
        if (btn) {
            btn.dataset.tab = tabId;
            btn.dataset.title = title;
            btn.dataset.storageKey = storageKey;
            btn.addEventListener('dblclick', (e) => {
                if (e.target && e.target.nodeName === 'SPAN') return;
                renameTab(tabId);
            });
        }
        updateTabListEntry(storageKey, title);

        document.getElementById('student-name-1')?.addEventListener('input', () => {
            syncTabTitleFromStudentName(tabId);
        });
        document.getElementById('student-name-1')?.addEventListener('change', () => {
            syncTabTitleFromStudentName(tabId, { persist: true });
        });
        document.getElementById('year-1')?.addEventListener('input', () => {
            persistTab(tabId, { silent: true });
        });
        document.getElementById('week-1')?.addEventListener('input', () => {
            persistTab(tabId, { silent: true });
        });

        document.querySelector('#tab1 .load-readings')?.addEventListener('click', () => {
            const year = document.getElementById('year-1').value;
            const week = document.getElementById('week-1').value;
            if (year && week) {
                const state = captureTabState(tabId);
                populateReadings(year, week, tabId);
                applyTabState(tabId, state);
                persistTabImmediately(tabId, { silent: true });
            } else {
                alert('Please enter year and week.');
            }
        });

        document.querySelector('#tab1 .print-form')?.addEventListener('click', () => {
            preparePrint('tab1', (id) => persistTabImmediately(id, { silent: true }));
        });

        btn?.addEventListener('click', () => switchTab(tabId));
        loadTab(tabId);
        syncTabTitleFromStudentName(tabId);
    }
}

// Initialize the application
init();

// Setup print handlers
setupPrintHandlers();
