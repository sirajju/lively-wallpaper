import * as persistence from '../persistence.js';

function getCountdowns() {
  return /** @type {{id:string,label:string,target:string}[]} */ (persistence.get('countdowns', []));
}

function saveCountdowns(list) {
  persistence.set('countdowns', list);
}

export function initCountdown() {
  const el = document.getElementById('countdown-widget');
  if (!el) return;

  const listEl = el.querySelector('.countdown-list');
  const labelInput = el.querySelector('.cd-label');
  const dateInput = el.querySelector('.cd-date');
  const addBtn = el.querySelector('.cd-add');

  function render() {
    if (!listEl) return;
    listEl.innerHTML = '';
    const now = Date.now();
    getCountdowns().forEach((cd) => {
      const target = new Date(cd.target).getTime();
      const diff = Math.max(0, target - now);
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);

      const item = document.createElement('div');
      item.className = 'countdown-item';
      item.innerHTML = `
        <div class="cd-info">
          <span class="cd-name">${escape(cd.label)}</span>
          <span class="cd-remaining">${days}d ${hours}h ${mins}m</span>
        </div>
        <button class="icon-btn cd-remove" data-id="${cd.id}" aria-label="Remove">×</button>
      `;
      listEl.appendChild(item);
    });

    listEl.querySelectorAll('.cd-remove').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        saveCountdowns(getCountdowns().filter((c) => c.id !== id));
        render();
      });
    });
  }

  addBtn?.addEventListener('click', () => {
    const label = labelInput?.value.trim() || 'Event';
    const date = dateInput?.value;
    if (!date) return;
    const list = getCountdowns();
    list.push({ id: crypto.randomUUID(), label, target: new Date(date).toISOString() });
    saveCountdowns(list);
    if (labelInput) labelInput.value = '';
    if (dateInput) dateInput.value = '';
    render();
  });

  persistence.subscribe((key) => {
    if (key === 'countdowns') render();
  });

  render();
  setInterval(render, 60000);
}

function escape(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}
