import { autoSizeTextarea } from '../utils/dom.js';

/**
 * Creates the readings table UI.
 * @param {Object} options
 * @param {Array<{text: string, type: 'default'|'custom', index?: number}>} options.items
 * @param {string} options.tabId
 * @param {Function} options.persistFn - Function to call when data changes
 * @returns {Object} Object containing readingsTable and addBtn elements
 */
export function createReadingsTable({ items, tabId, persistFn }) {
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

    items.forEach(item => {
        const row = createReadingRow({
            text: item.text,
            type: item.type,
            index: item.index,
            tabId,
            persistFn
        });
        readingsTbody.appendChild(row);
    });

    setupRowReorder(readingsTbody, persistFn, tabId);

    // Add row button
    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'add-row';
    addBtn.textContent = 'Add Row';

    addBtn.addEventListener('click', () => {
        const tbody = readingsTable.querySelector('tbody');
        const row = createReadingRow({
            text: '',
            type: 'custom',
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
function createReadingRow({ text, type, index, tabId, persistFn }) {
    const row = document.createElement('tr');

    if (type === 'default') {
        row.dataset.type = 'default';
        row.dataset.index = index;
    } else {
        row.dataset.type = 'custom';
    }

    const readingCell = document.createElement('td');
    const readingContainer = document.createElement('div');
    readingContainer.className = 'reading-row-container';

    const dragHandle = document.createElement('span');
    dragHandle.className = 'drag-handle';
    dragHandle.setAttribute('aria-label', 'Drag to reorder');
    dragHandle.textContent = '⠿';
    readingContainer.appendChild(dragHandle);

    const readingTextarea = document.createElement('textarea');
    readingTextarea.value = String(text ?? '');
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
 * Sets up pointer-based drag-to-reorder on a tbody.
 * Works for both mouse and touch.
 */
function setupRowReorder(tbody, persistFn, tabId) {
    let dragging = null, placeholder = null, startY = 0, moved = false;

    tbody.addEventListener('pointerdown', e => {
        const handle = e.target.closest('.drag-handle');
        if (!handle) return;
        const row = handle.closest('tr');
        if (!row) return;
        e.preventDefault();
        dragging = row;
        startY = e.clientY;
        moved = false;
        placeholder = document.createElement('tr');
        placeholder.className = 'drag-placeholder';
        placeholder.innerHTML = '<td colspan="2"></td>';
        document.addEventListener('pointermove', onMove, { passive: false });
        document.addEventListener('pointerup', onUp);
        document.addEventListener('pointercancel', onUp);
    });

    function onMove(e) {
        if (!dragging) return;
        e.preventDefault();
        if (!moved && Math.abs(e.clientY - startY) > 4) {
            moved = true;
            dragging.after(placeholder);
            dragging.classList.add('is-dragging');
        }
        if (!moved) return;
        dragging.style.display = 'none';
        const el = document.elementFromPoint(e.clientX, e.clientY);
        dragging.style.display = '';
        const targetRow = el?.closest('tr');
        if (targetRow && targetRow !== placeholder && targetRow !== dragging && targetRow.closest('tbody') === tbody) {
            const { top, height } = targetRow.getBoundingClientRect();
            if (e.clientY < top + height / 2) tbody.insertBefore(placeholder, targetRow);
            else targetRow.after(placeholder);
        }
    }

    function onUp() {
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onUp);
        document.removeEventListener('pointercancel', onUp);
        if (!dragging) return;
        if (moved && placeholder.parentElement) tbody.insertBefore(dragging, placeholder);
        placeholder.remove();
        dragging.classList.remove('is-dragging');
        dragging = null;
        placeholder = null;
        moved = false;
        persistFn(tabId, { silent: true });
    }
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
