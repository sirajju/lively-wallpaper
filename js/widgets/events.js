import * as persistence from '../persistence.js';

/** @typedef {{id:string,title:string,date:string,time:string}} Event */

function getEvents() {
  return /** @type {Event[]} */ (persistence.get('events', []));
}

function saveEvents(list) {
  persistence.set('events', list);
}

export function initEvents() {
  const el = document.getElementById('events-widget');
  if (!el) return;

  const listEl = el.querySelector('.events-list');
  const titleInput = el.querySelector('.ev-title');
  const dateInput = el.querySelector('.ev-date');
  const timeInput = el.querySelector('.ev-time');
  const addBtn = el.querySelector('.ev-add');

  function render() {
    if (!listEl) return;
    const sorted = [...getEvents()].sort((a, b) => {
      const da = new Date(`${a.date}T${a.time || '00:00'}`);
      const db = new Date(`${b.date}T${b.time || '00:00'}`);
      return da - db;
    });

    listEl.innerHTML = sorted.length
      ? sorted
          .map(
            (ev) => `
        <div class="event-item">
          <div class="ev-when">${esc(ev.date)} ${esc(ev.time || '')}</div>
          <div class="ev-title-text">${esc(ev.title)}</div>
          <button class="icon-btn ev-del" data-id="${ev.id}" aria-label="Delete">×</button>
        </div>`
          )
          .join('')
      : '<div class="empty-state">No upcoming events</div>';

    listEl.querySelectorAll('.ev-del').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        saveEvents(getEvents().filter((e) => e.id !== id));
        render();
      });
    });
  }

  addBtn?.addEventListener('click', () => {
    const title = titleInput?.value.trim();
    const date = dateInput?.value;
    if (!title || !date) return;
    saveEvents([
      ...getEvents(),
      {
        id: crypto.randomUUID(),
        title,
        date,
        time: timeInput?.value || '09:00',
      },
    ]);
    if (titleInput) titleInput.value = '';
    render();
  });

  persistence.subscribe((key) => {
    if (key === 'events' || key === '*') render();
  });

  render();
}

function esc(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}
