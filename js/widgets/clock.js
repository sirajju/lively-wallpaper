import { formatTime } from '../utils.js';
import * as persistence from '../persistence.js';

export function initClock() {
  const el = document.getElementById('clock-widget');
  if (!el) return;

  const timeEl = el.querySelector('.clock-time');
  const dateEl = el.querySelector('.clock-date');
  const dayEl = el.querySelector('.clock-day');

  function tick() {
    const now = new Date();
    const use24 = Boolean(persistence.get('timeFormat24', false));
    if (timeEl) timeEl.textContent = formatTime(now, use24);
    if (dateEl) {
      dateEl.textContent = now.toLocaleDateString([], {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    }
    if (dayEl) dayEl.textContent = now.toLocaleDateString([], { weekday: 'long' });
  }

  persistence.subscribe((key) => {
    if (key === 'timeFormat24') tick();
  });

  tick();
  setInterval(tick, 1000);
}
