import { formatTime } from '../utils.js';
import * as persistence from '../persistence.js';

/**
 * @param {HTMLElement} container
 * @param {string} newText
 * @param {string} [prevText]
 */
function renderFlipTime(container, newText, prevText) {
  if (!container) return;
  const groups = newText.split(/(:|\s)/);
  const prevGroups = (prevText || '').split(/(:|\s)/);

  container.innerHTML = '';
  groups.forEach((ch, i) => {
    const span = document.createElement('span');
    span.className = 'clock-digit';
    span.textContent = ch;
    if (prevGroups[i] !== undefined && prevGroups[i] !== ch && ch !== ':' && ch.trim()) {
      span.classList.add('is-ticking');
    }
    container.appendChild(span);
  });
}

export function initClock() {
  const el = document.getElementById('clock-widget');
  if (!el) return;

  const timeEl = el.querySelector('.clock-time');
  const dateEl = el.querySelector('.clock-date');
  const dayEl = el.querySelector('.clock-day');
  let prevTime = '';
  let prevMinute = -1;

  function tick() {
    const now = new Date();
    const use24 = Boolean(persistence.get('timeFormat24', false));
    const timeStr = formatTime(now, use24);

    if (timeEl) {
      renderFlipTime(timeEl, timeStr, prevTime);
      prevTime = timeStr;

      if (now.getMinutes() !== prevMinute) {
        prevMinute = now.getMinutes();
        timeEl.classList.add('is-minute-pulse');
        setTimeout(() => timeEl.classList.remove('is-minute-pulse'), 1200);
      }
    }

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
