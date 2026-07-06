import { formatTime } from '../utils.js';
import * as persistence from '../persistence.js';

/**
 * Build per-digit spans for the hours:minutes group, flipping only the
 * characters that changed since the previous render.
 * @param {string} text e.g. "04:10"
 * @param {string} prevText
 * @returns {DocumentFragment}
 */
function buildHmDigits(text, prevText) {
  const frag = document.createDocumentFragment();
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === ':') {
      const colon = document.createElement('span');
      colon.className = 'clock-colon';
      colon.textContent = ':';
      frag.appendChild(colon);
      continue;
    }
    const span = document.createElement('span');
    span.className = 'clock-digit';
    span.textContent = ch;
    if (prevText && prevText[i] !== undefined && prevText[i] !== ch) {
      span.classList.add('is-ticking');
    }
    frag.appendChild(span);
  }
  return frag;
}

export function initClock() {
  const el = document.getElementById('clock-widget');
  if (!el) return;

  const timeEl = el.querySelector('.clock-time');
  const dateEl = el.querySelector('.clock-date');
  const dayEl = el.querySelector('.clock-day');

  let hmEl;
  let secEl;
  let merEl;
  if (timeEl) {
    timeEl.textContent = '';
    hmEl = document.createElement('span');
    hmEl.className = 'clock-hm';
    secEl = document.createElement('span');
    secEl.className = 'clock-sec';
    merEl = document.createElement('span');
    merEl.className = 'clock-mer';
    timeEl.append(hmEl, secEl, merEl);
  }

  let prevHM = '';
  let prevSec = '';
  let prevMinute = -1;

  function tick() {
    const now = new Date();
    const use24 = Boolean(persistence.get('timeFormat24', false));
    const raw = formatTime(now, use24); // "04:10:48 PM" or "16:10:48"
    const [clockPart, meridiem = ''] = raw.split(' ');
    const segments = clockPart.split(':');
    const hm = segments.slice(0, 2).join(':');
    const sec = segments[2] || '';

    if (hmEl && hm !== prevHM) {
      hmEl.innerHTML = '';
      hmEl.appendChild(buildHmDigits(hm, prevHM));
      prevHM = hm;
    }

    if (secEl && sec !== prevSec) {
      secEl.textContent = sec;
      secEl.classList.remove('is-tick');
      // Force reflow so the tick animation restarts each second.
      void secEl.offsetWidth;
      secEl.classList.add('is-tick');
      prevSec = sec;
    }

    if (merEl) {
      merEl.textContent = meridiem;
      merEl.hidden = !meridiem;
    }

    if (timeEl && now.getMinutes() !== prevMinute) {
      prevMinute = now.getMinutes();
      timeEl.classList.add('is-minute-pulse');
      setTimeout(() => timeEl.classList.remove('is-minute-pulse'), 1200);
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
    if (key === 'timeFormat24' || key === '*') {
      prevHM = '';
      prevSec = '';
      tick();
    }
  });

  tick();
  setInterval(tick, 1000);
}
