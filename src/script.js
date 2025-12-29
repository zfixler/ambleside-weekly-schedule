import readingLibraryData from '../assets/readingLibrary.json';

let readingLibrary = {};
let tabCounter = 1;
let activeTab = 'tab1';

const TAB_LIST_KEY = 'ambleside_tabs_v1';
const TAB_DATA_PREFIX = 'ambleside_tab_v1:';

function slugifyTitle(title) {
    return String(title || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 40) || 'tab';
}

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

function setTabList(tabs) {
    localStorage.setItem(TAB_LIST_KEY, JSON.stringify(tabs));
}

function getAllStorageKeys() {
    return new Set(getTabList().map(t => t.storageKey).filter(Boolean));
}

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

function getTabButton(tabId) {
    return document.querySelector(`.tab-button[data-tab="${tabId}"]`);
}

function getTabStorageKey(tabId) {
    return getTabButton(tabId)?.dataset.storageKey || '';
}

function getTabTitle(tabId) {
    return getTabButton(tabId)?.dataset.title || '';
}

function getDefaultTabTitle(tabId) {
    const num = Number(String(tabId || '').replace('tab', ''));
    return Number.isFinite(num) && num > 0 ? `Form ${num}` : 'Form';
}

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

function removeTabListEntry(storageKey) {
    const tabs = getTabList().filter(t => t.storageKey !== storageKey);
    setTabList(tabs);
}

async function loadReadingLibrary() {
    // Bundle the library into the build so dist/index.html works when opened directly (file://)
    readingLibrary = readingLibraryData;
}

function getReadings(year, week) {
    const yearKey = `year_${year}`;
    const weekKey = `week_${week}`;
    if (readingLibrary[yearKey] && readingLibrary[yearKey][weekKey]) {
        return readingLibrary[yearKey][weekKey];
    }
    return null;
}

function autoSizeTextarea(textarea) {
    if (!textarea) return;
    // Reset first, then set to scrollHeight. Add a small buffer to avoid
    // sub-pixel rounding causing the last line to be clipped (common in print).
    textarea.style.height = 'auto';
    textarea.style.overflow = 'hidden';
    const extra = 2;
    textarea.style.height = `${textarea.scrollHeight + extra}px`;
}

function autoSizeTextareasInContainer(container) {
    if (!container) return;
    container.querySelectorAll('textarea').forEach(t => autoSizeTextarea(t));
}

function autoSizeTextareasInTab(tabId) {
    const pane = document.getElementById(tabId);
    if (!pane) return;
    autoSizeTextareasInContainer(pane);
}

function autoSizeTextareasInActiveTab() {
    const pane = document.querySelector('.tab-pane.active') || document.getElementById('tab1');
    autoSizeTextareasInContainer(pane);
}

function populateReadings(readings, tabId) {
    const container = document.querySelector(`#${tabId} .readings-container`);
    container.innerHTML = '';
    if (!readings) {
        container.innerHTML = '<p>No readings found for this year and week.</p>';
        return;
    }

    // Readings table
    const readingsTable = document.createElement('table');
    readingsTable.className = 'readings-table';
    readingsTable.innerHTML = `
        <thead>
            <tr>
                <th>Reading</th>
                <th>Completed</th>
            </tr>
        </thead>
        <tbody>
        </tbody>
    `;
    const readingsTbody = readingsTable.querySelector('tbody');
    readings.forEach((reading) => {
        const row = document.createElement('tr');

        const readingCell = document.createElement('td');
        const readingTextarea = document.createElement('textarea');
        // Default HTML textarea height is ~2 rows; set to 1 so short readings don't waste space.
        readingTextarea.rows = 1;
        readingTextarea.value = String(reading ?? '');
        readingTextarea.addEventListener('input', () => autoSizeTextarea(readingTextarea));
        readingCell.appendChild(readingTextarea);
        // Initial size after being added to the DOM; queue for next tick.
        queueMicrotask(() => autoSizeTextarea(readingTextarea));

        const completedCell = document.createElement('td');

        row.appendChild(readingCell);
        row.appendChild(completedCell);
        readingsTbody.appendChild(row);
    });

    // Single notes textarea
    const notesDiv = document.createElement('div');
    notesDiv.className = 'notes-section';
    notesDiv.innerHTML = `
        <h3>Notes</h3>
        <textarea class="notes-textarea" placeholder="Enter notes here"></textarea>
    `;

    // Subjects table
    const subjectsTable = document.createElement('table');
    subjectsTable.className = 'subjects-table';
    subjectsTable.innerHTML = `
        <thead>
            <tr>
                <th>Subject</th>
                <th>M</th>
                <th>T</th>
                <th>W</th>
                <th>Th</th>
                <th>F</th>
            </tr>
        </thead>
        <tbody>
        </tbody>
    `;
    const subjectsTbody = subjectsTable.querySelector('tbody');
    const days = ['M', 'T', 'W', 'Th', 'F'];
    for (let i = 0; i < 18; i++) {  // 18 rows for subjects
        const row = document.createElement('tr');
        let rowHtml = `<td><input type="text" /></td>`;
        days.forEach(day => {
            rowHtml += `<td><button type="button" class="day-button" data-day="${day}"></button></td>`;
        });
        row.innerHTML = rowHtml;
        subjectsTbody.appendChild(row);
    }
    const tablesDiv = document.createElement('div');
    tablesDiv.className = 'tables-div';

    // Readings section
    const readingsSection = document.createElement('div');
    readingsSection.className = 'table-section';
    const readingsTitle = document.createElement('h3');
    readingsTitle.textContent = 'Ambleside Readings';
    readingsSection.appendChild(readingsTitle);
    readingsSection.appendChild(readingsTable);
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

    // Add event listeners for day buttons
    document.querySelectorAll(`#${tabId} .day-button`).forEach(btn => {
        btn.addEventListener('click', () => {
            const cell = btn.closest('td');
            if (cell) cell.classList.toggle('highlighted');
        });
    });

    // Persist reading edits without requiring explicit Save
    document.querySelectorAll(`#${tabId} .readings-table tbody textarea`).forEach(textarea => {
        autoSizeTextarea(textarea);
        textarea.addEventListener('change', () => persistTab(tabId, { silent: true }));
    });
}

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

function applyTabState(tabId, state) {
    if (!state) return;
    const pane = document.getElementById(tabId);
    if (!pane) return;

    const notesEl = pane.querySelector('.notes-textarea');
    if (notesEl) notesEl.value = state.notes || '';

    if (Array.isArray(state.subjects)) {
        state.subjects.slice(0, 18).forEach((subj, index) => {
            const tr = pane.querySelector(`.subjects-table tbody tr:nth-child(${index + 1})`);
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

function persistTab(tabId, { silent = false } = {}) {
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
        readings: [],
        subjects: [],
        notes: document.querySelector(`#${tabId} .notes-textarea`)?.value || ''
    };

    document.querySelectorAll(`#${tabId} .readings-table tbody tr`).forEach(tr => {
        const textarea = tr.querySelector('textarea');
        data.readings.push(textarea?.value || '');
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

    localStorage.setItem(`${TAB_DATA_PREFIX}${storageKey}`, JSON.stringify(data));
    updateTabListEntry(storageKey, title);
}

function saveForm(tabId) {
    persistTab(tabId, { silent: true });
}

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
        const readings = getReadings(parsed.year, parsed.week);
        populateReadings(readings, tabId);
    }

    setTimeout(() => {
        if (Array.isArray(parsed.readings)) {
            const textareas = document.querySelectorAll(`#${tabId} .readings-table tbody textarea`);
            parsed.readings.forEach((val, idx) => {
                if (textareas[idx]) {
                    textareas[idx].value = val || '';
                    autoSizeTextarea(textareas[idx]);
                }
            });
        }

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
    }, 50);
}

function switchTab(tabId) {
    // When changing tabs, persist the current tab and restore the target tab
    // so readings/notes/subjects show up immediately.
    if (activeTab && activeTab !== tabId) {
        try {
            persistTab(activeTab, { silent: true });
        } catch {
            // Best-effort: do not block switching if something is missing.
        }
    }

    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
    document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
    document.getElementById(tabId).classList.add('active');
    activeTab = tabId;

    // Restore saved UI state for the newly active tab (including readings table).
    loadTab(tabId);
    autoSizeTextareasInTab(tabId);
}

function rebuildTabButton(tabId, title, storageKey) {
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
        closeTab(tabId);
    });
    btn.appendChild(closeBtn);
}

function renameTab(tabId) {
    const btn = getTabButton(tabId);
    if (!btn) return;

    const oldTitle = btn.dataset.title || btn.textContent.replace(/\s*×\s*$/, '').trim();
    const oldStorageKey = btn.dataset.storageKey;
    const nextTitle = prompt('Tab name:', oldTitle);
    if (!nextTitle) return;

    const newStorageKey = uniqueStorageKey(slugifyTitle(nextTitle));

    // migrate data
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
    closeBtn.textContent = ' ×';
    closeBtn.style.cursor = 'pointer';
    closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeTab(tabId);
    });
    tabButton.appendChild(closeBtn);

    document.querySelector('.tab-buttons').insertBefore(tabButton, document.getElementById('add-tab'));

    // Create tab pane
    const tabPane = document.createElement('div');
    tabPane.id = tabId;
    tabPane.className = 'tab-pane';
    tabPane.innerHTML = `
        <div class="form-container">
            <h1>Ambleside Weekly Schedule</h1>
            <form class="weekly-form">
                <div class="form-group">
                    <label for="student-name-${num}">Student Name:</label>
                    <input type="text" id="student-name-${num}" required>
                </div>
                <div class="form-group">
                    <label for="year-${num}">Year:</label>
                    <input type="number" id="year-${num}" min="1" required>
                </div>
                <div class="form-group">
                    <label for="week-${num}">Week:</label>
                    <input type="number" id="week-${num}" min="1" max="36" required>
                </div>
                <button type="button" class="load-readings">Load Readings</button>
                <div class="readings-container"></div>
                <button type="button" class="print-form">Print Form</button>
            </form>
        </div>
    `;
    document.querySelector('.tab-content').appendChild(tabPane);

    // Add event listeners
    tabPane.querySelector(`#student-name-${num}`)?.addEventListener('input', () => {
        syncTabTitleFromStudentName(tabId);
    });
    tabPane.querySelector(`#student-name-${num}`)?.addEventListener('change', () => {
        syncTabTitleFromStudentName(tabId, { persist: true });
    });

    tabPane.querySelector('.load-readings').addEventListener('click', () => {
        const year = document.getElementById(`year-${num}`).value;
        const week = document.getElementById(`week-${num}`).value;
        if (year && week) {
            const state = captureTabState(tabId);
            const readings = getReadings(year, week);
            populateReadings(readings, tabId);
            applyTabState(tabId, state);
            persistTab(tabId, { silent: true });
        } else {
            alert('Please enter year and week.');
        }
    });

    tabPane.querySelector('.print-form').addEventListener('click', () => {
        persistTab(tabId, { silent: true });
        autoSizeTextareasInTab(tabId);
        // Run once more on the next frame to ensure layout has settled.
        requestAnimationFrame(() => {
            autoSizeTextareasInTab(tabId);
            window.print();
        });
    });

    updateTabListEntry(storageKey, title);
    loadTab(tabId);

    // If the new tab has a student name already loaded from storage, reflect it.
    syncTabTitleFromStudentName(tabId);

    switchTab(tabId);
}

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

function clearTabUi() {
    document.querySelectorAll('.tab-pane').forEach(p => p.remove());
    document.querySelectorAll('.tab-button').forEach(b => b.remove());
}

async function init() {
    await loadReadingLibrary();

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

        document.querySelector('#tab1 .load-readings')?.addEventListener('click', () => {
            const year = document.getElementById('year-1').value;
            const week = document.getElementById('week-1').value;
            if (year && week) {
                const state = captureTabState(tabId);
                const readings = getReadings(year, week);
                populateReadings(readings, tabId);
                applyTabState(tabId, state);
                persistTab(tabId, { silent: true });
            } else {
                alert('Please enter year and week.');
            }
        });
        document.querySelector('#tab1 .print-form')?.addEventListener('click', () => {
            persistTab('tab1', { silent: true });
            autoSizeTextareasInTab('tab1');
            requestAnimationFrame(() => {
                autoSizeTextareasInTab('tab1');
                window.print();
            });
        });
        btn?.addEventListener('click', () => switchTab(tabId));

        loadTab(tabId);

        syncTabTitleFromStudentName(tabId);
    }
}

init();

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