import * as persistence from '../persistence.js';

const CITY_LABELS = {
  'America/New_York': 'New York',
  'Europe/London': 'London',
  'Asia/Tokyo': 'Tokyo',
  'America/Los_Angeles': 'Los Angeles',
  'Europe/Paris': 'Paris',
  'Asia/Kolkata': 'Mumbai',
  'Australia/Sydney': 'Sydney',
};

export function initWorldClock() {
  const el = document.getElementById('worldclock-widget');
  if (!el) return;

  const listEl = el.querySelector('.wc-list');
  const select = el.querySelector('.wc-add-select');
  const addBtn = el.querySelector('.wc-add');

  if (select) {
    Object.entries(CITY_LABELS).forEach(([tz, label]) => {
      const opt = document.createElement('option');
      opt.value = tz;
      opt.textContent = label;
      select.appendChild(opt);
    });
  }

  function getZones() {
    return /** @type {string[]} */ (persistence.get('worldClocks', ['America/New_York', 'Europe/London', 'Asia/Tokyo']));
  }

  function saveZones(zones) {
    persistence.set('worldClocks', zones);
  }

  function render() {
    if (!listEl) return;
    const use24 = Boolean(persistence.get('timeFormat24', false));
    listEl.innerHTML = '';
    getZones().forEach((tz) => {
      const now = new Date();
      const time = now.toLocaleTimeString([], {
        timeZone: tz,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: !use24,
      });
      const item = document.createElement('div');
      item.className = 'wc-item';
      item.innerHTML = `
        <span class="wc-city">${CITY_LABELS[tz] || tz}</span>
        <span class="wc-time">${time}</span>
        <button class="icon-btn wc-remove" data-tz="${tz}" aria-label="Remove">×</button>
      `;
      listEl.appendChild(item);
    });

    listEl.querySelectorAll('.wc-remove').forEach((btn) => {
      btn.addEventListener('click', () => {
        const tz = btn.getAttribute('data-tz');
        saveZones(getZones().filter((z) => z !== tz));
        render();
      });
    });
  }

  addBtn?.addEventListener('click', () => {
    const tz = select?.value;
    if (!tz) return;
    const zones = getZones();
    if (!zones.includes(tz)) saveZones([...zones, tz]);
    render();
  });

  persistence.subscribe((key) => {
    if (key === 'worldClocks' || key === 'timeFormat24') render();
  });

  render();
  setInterval(render, 1000);
}
