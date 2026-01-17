/**
 * Creates the subjects table UI.
 * @param {string} tabId
 * @param {Function} persistFn - Function to call when data changes
 * @param {number} rowCount - Number of subject rows (default 18)
 * @returns {HTMLTableElement}
 */
export function createSubjectsTable(tabId, persistFn, rowCount = 18) {
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

    for (let i = 0; i < rowCount; i++) {
        const row = document.createElement('tr');
        let rowHtml = `<td><input type="text" /></td>`;
        days.forEach(day => {
            rowHtml += `<td><button type="button" class="day-button" data-day="${day}"></button></td>`;
        });
        row.innerHTML = rowHtml;
        subjectsTbody.appendChild(row);
    }

    return subjectsTable;
}

/**
 * Sets up event listeners for subjects table.
 * @param {string} tabId
 * @param {Function} persistFn
 */
export function setupSubjectsListeners(tabId, persistFn) {
    // Day button click handlers
    document.querySelectorAll(`#${tabId} .day-button`).forEach(btn => {
        btn.addEventListener('click', () => {
            const cell = btn.closest('td');
            if (cell) cell.classList.toggle('highlighted');
            persistFn(tabId, { silent: true });
        });
    });

    // Subject name input handlers
    document.querySelectorAll(`#${tabId} .subjects-table tbody input[type="text"]`).forEach(input => {
        input.addEventListener('input', () => persistFn(tabId, { silent: true }));
    });
}

/**
 * Captures the current state of subjects.
 * @param {HTMLElement} pane
 * @returns {Array}
 */
export function captureSubjectsState(pane) {
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

    return subjects;
}

/**
 * Applies saved subjects state to the UI.
 * @param {HTMLElement} pane
 * @param {Array} subjects
 */
export function applySubjectsState(pane, subjects) {
    if (!Array.isArray(subjects)) return;

    subjects.slice(0, 18).forEach((subj, index) => {
        const tr = pane.querySelector(`.subjects-table tbody tr:nth-child(${index + 1})`);
        if (!tr) return;

        const input = tr.querySelector('input[type="text"]');
        if (input) input.value = subj.name || '';

        tr.querySelectorAll('.day-button').forEach(btn => {
            const cell = btn.closest('td');
            if (!cell) return;
            if (subj.days && subj.days[btn.dataset.day]) {
                cell.classList.add('highlighted');
            } else {
                cell.classList.remove('highlighted');
            }
        });
    });
}
