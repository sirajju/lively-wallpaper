import * as persistence from '../persistence.js';
import { readFileAsText } from '../utils.js';
import { iconSvg } from '../icons.js';
import { enhanceSelect } from '../custom-select.js';

/** @typedef {{id:string,text:string,done:boolean,priority:'low'|'medium'|'high',tags:string[]}} Todo */

function getTodos() {
  return /** @type {Todo[]} */ (persistence.get('todos', []));
}

function saveTodos(list) {
  persistence.set('todos', list);
}

export function initTodo() {
  const el = document.getElementById('todo-widget');
  if (!el) return;

  const listEl = el.querySelector('.todo-list');
  const input = el.querySelector('.todo-input');
  const prioritySelect = el.querySelector('.todo-priority');
  const tagInput = el.querySelector('.todo-tags');
  const addBtn = el.querySelector('.todo-add');
  const exportBtn = el.querySelector('.todo-export');
  const importBtn = el.querySelector('.todo-import');
  const importFile = el.querySelector('.todo-import-file');
  const countBadge = el.querySelector('.todo-count-badge');

  if (prioritySelect instanceof HTMLSelectElement) enhanceSelect(prioritySelect);

  function updateBadge() {
    const todos = getTodos();
    const done = todos.filter((t) => t.done).length;
    if (countBadge) {
      countBadge.textContent = todos.length ? `${done}/${todos.length}` : '';
    }
  }

  function render() {
    if (!listEl) return;
    listEl.innerHTML = '';
    const todos = getTodos();

    if (!todos.length) {
      listEl.innerHTML = `
        <div class="todo-empty">
          <span class="todo-empty-icon">${iconSvg('list-todo', 36)}</span>
          <span class="todo-empty-text">No tasks yet</span>
        </div>
      `;
      updateBadge();
      return;
    }

    todos.forEach((todo) => {
      const item = document.createElement('div');
      item.className = `todo-item priority-${todo.priority}${todo.done ? ' is-done' : ''}`;
      item.innerHTML = `
        <span class="todo-drag-handle" aria-hidden="true">${iconSvg('grip-vertical', 14)}</span>
        <label class="todo-check">
          <input type="checkbox" ${todo.done ? 'checked' : ''} data-id="${todo.id}">
          <span class="check-circle">
            <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
              <path class="check-path" d="M2 6l3 3 5-5"/>
            </svg>
          </span>
        </label>
        <span class="todo-text">${esc(todo.text)}</span>
        <span class="todo-tags-list">${todo.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</span>
        <button class="icon-btn todo-del" data-id="${todo.id}" aria-label="Delete">×</button>
      `;
      listEl.appendChild(item);
    });

    listEl.querySelectorAll('input[type=checkbox]').forEach((cb) => {
      cb.addEventListener('change', () => {
        const id = cb.getAttribute('data-id');
        saveTodos(getTodos().map((t) => (t.id === id ? { ...t, done: cb.checked } : t)));
        render();
      });
    });

    listEl.querySelectorAll('.todo-del').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        saveTodos(getTodos().filter((t) => t.id !== id));
        render();
      });
    });

    updateBadge();
  }

  addBtn?.addEventListener('click', addTask);
  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addTask();
  });

  function addTask() {
    const text = input?.value.trim();
    if (!text) return;
    const tags = (tagInput?.value || '')
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    const priority = /** @type {Todo['priority']} */ (prioritySelect?.value || 'medium');
    saveTodos([
      ...getTodos(),
      { id: crypto.randomUUID(), text, done: false, priority, tags },
    ]);
    if (input) input.value = '';
    if (tagInput) tagInput.value = '';
    render();
  }

  exportBtn?.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(getTodos(), null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'todos.json';
    a.click();
    URL.revokeObjectURL(a.href);
  });

  importBtn?.addEventListener('click', () => importFile?.click());
  importFile?.addEventListener('change', async () => {
    const file = importFile.files?.[0];
    if (!file) return;
    try {
      const json = await readFileAsText(file);
      const data = JSON.parse(json);
      if (Array.isArray(data)) {
        saveTodos(data);
        render();
      }
    } catch {
      /* invalid file */
    }
    importFile.value = '';
  });

  persistence.subscribe((key) => {
    if (key === 'todos') render();
  });

  render();
}

function esc(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}
