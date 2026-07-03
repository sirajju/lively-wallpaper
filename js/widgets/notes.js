import * as persistence from '../persistence.js';
import { readFileAsText } from '../utils.js';

/** @typedef {{id:string,text:string,color:string}} Note */

function getNotes() {
  return /** @type {Note[]} */ (persistence.get('notes', []));
}

function saveNotes(list) {
  persistence.set('notes', list);
}

const COLORS = ['#FEF08A', '#FBCFE8', '#BAE6FD', '#BBF7D0', '#E9D5FF'];

export function initNotes() {
  const el = document.getElementById('notes-widget');
  if (!el) return;

  const board = el.querySelector('.notes-board');
  const addBtn = el.querySelector('.notes-add');
  const exportBtn = el.querySelector('.notes-export');
  const importBtn = el.querySelector('.notes-import');
  const importFile = el.querySelector('.notes-import-file');

  function render() {
    if (!board) return;
    board.innerHTML = '';
    getNotes().forEach((note) => {
      const sticky = document.createElement('div');
      sticky.className = 'sticky-note';
      sticky.style.setProperty('--note-color', note.color);
      sticky.innerHTML = `
        <textarea class="note-text" data-id="${note.id}" rows="4">${esc(note.text)}</textarea>
        <div class="note-actions">
          <button class="icon-btn note-del" data-id="${note.id}" aria-label="Delete">×</button>
        </div>
      `;
      board.appendChild(sticky);
    });

    board.querySelectorAll('.note-text').forEach((ta) => {
      ta.addEventListener('input', () => {
        const id = ta.getAttribute('data-id');
        saveNotes(getNotes().map((n) => (n.id === id ? { ...n, text: ta.value } : n)));
      });
    });

    board.querySelectorAll('.note-del').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        saveNotes(getNotes().filter((n) => n.id !== id));
        render();
      });
    });
  }

  addBtn?.addEventListener('click', () => {
    saveNotes([
      ...getNotes(),
      {
        id: crypto.randomUUID(),
        text: '',
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      },
    ]);
    render();
  });

  exportBtn?.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(getNotes(), null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'notes.json';
    a.click();
    URL.revokeObjectURL(a.href);
  });

  importBtn?.addEventListener('click', () => importFile?.click());
  importFile?.addEventListener('change', async () => {
    const file = importFile.files?.[0];
    if (!file) return;
    try {
      const data = JSON.parse(await readFileAsText(file));
      if (Array.isArray(data)) {
        saveNotes(data);
        render();
      }
    } catch {
      /* noop */
    }
    importFile.value = '';
  });

  persistence.subscribe((key) => {
    if (key === 'notes') render();
  });

  render();
}

function esc(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}
