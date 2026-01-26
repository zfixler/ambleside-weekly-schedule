import { autoSizeTextarea } from '../utils/dom.js';

/**
 * Creates the readings table UI.
 * @param {Object} options
 * @param {string[]} allReadings - Combined default and custom readings
 * @param {number[]} keptIndices - Indices of kept default readings
 * @param {number} keptDefaultLength - Number of kept default readings
 * @param {string} tabId
 * @param {Function} persistFn - Function to call when data changes
 * @returns {Object} Object containing readingsTable and addBtn elements
 */
export function createReadingsTable({ allReadings, keptIndices, keptDefaultLength, tabId, persistFn }) {
    const readingsTable = document.createElement('table');
    readingsTable.className = 'readings-table';
    readingsTable.innerHTML = `
        <thead>
            <tr>
                <th>Reading</th>
                <th>Done</th>
            </tr>
        </thead>
        <tbody>
        </tbody>
    `;

    const readingsTbody = readingsTable.querySelector('tbody');

    allReadings.forEach((reading, i) => {
        const row = createReadingRow({
            reading,
            isDefault: i < keptDefaultLength,
            defaultIndex: i < keptDefaultLength ? keptIndices[i] : undefined,
            tabId,
            persistFn
        });
        readingsTbody.appendChild(row);
    });

    // Add row button
    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'add-row';
    addBtn.textContent = 'Add Row';

    addBtn.addEventListener('click', () => {
        const tbody = readingsTable.querySelector('tbody');
        const row = createReadingRow({
            reading: '',
            isDefault: false,
            tabId,
            persistFn
        });
        tbody.appendChild(row);
        persistFn(tabId, { silent: true });
    });

    return { readingsTable, addBtn };
}

/**
 * Creates a single reading row.
 * @param {Object} options
 * @returns {HTMLTableRowElement}
 */
function createReadingRow({ reading, isDefault, defaultIndex, tabId, persistFn }) {
    const row = document.createElement('tr');

    if (isDefault) {
        row.dataset.type = 'default';
        row.dataset.index = defaultIndex;
    } else {
        row.dataset.type = 'custom';
    }

    const readingCell = document.createElement('td');
    const readingContainer = document.createElement('div');
    readingContainer.className = 'reading-row-container';

    const readingTextarea = document.createElement('textarea');
    readingTextarea.value = String(reading ?? '');
    readingTextarea.addEventListener('input', () => autoSizeTextarea(readingTextarea));
    readingTextarea.addEventListener('input', () => persistFn(tabId, { silent: true }));
    readingContainer.appendChild(readingTextarea);

    // Initial size after being added to the DOM
    queueMicrotask(() => autoSizeTextarea(readingTextarea));

    const removeBtn = createRemoveButton(() => {
        row.remove();
        persistFn(tabId, { silent: true });
    });
    readingContainer.appendChild(removeBtn);
    readingCell.appendChild(readingContainer);

    const completedCell = document.createElement('td');

    row.appendChild(readingCell);
    row.appendChild(completedCell);

    return row;
}

/**
 * Creates a remove button with trash icon.
 * @param {Function} onClick
 * @returns {HTMLButtonElement}
 */
function createRemoveButton(onClick) {
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'remove-row';
    removeBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3,6 5,6 21,6"></polyline><path d="m19,6v14a2,2 0 0,1-2,2H7a2,2 0 0,1-2-2V6m3,0V4a2,2 0 0,1,2-2h4a2,2 0 0,1,2,2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`;
    removeBtn.addEventListener('click', onClick);
    return removeBtn;
}

/**
 * Creates the notes section.
 * @param {string} tabId
 * @param {Function} persistFn
 * @returns {HTMLDivElement}
 */
export function createNotesSection(tabId, persistFn) {
    const notesDiv = document.createElement('div');
    notesDiv.className = 'notes-section';
    notesDiv.innerHTML = `
        <h3>Notes</h3>
        <textarea class="notes-textarea"></textarea>
    `;

    const notesTextarea = notesDiv.querySelector('.notes-textarea');
    if (notesTextarea) {
        notesTextarea.addEventListener('input', () => persistFn(tabId, { silent: true }));
    }

    return notesDiv;
}
