import { formatDuration } from '../utils.js';
import * as persistence from '../persistence.js';
import { setPlayPauseIcon } from '../icons.js';

let workSec = 25 * 60;
let breakSec = 5 * 60;
let remaining = workSec;
let isWork = true;
let running = false;
let timerId = null;

function drawTicks(svg) {
  const g = svg?.querySelector('.pomo-ticks');
  if (!g) return;
  g.innerHTML = '';
  const cx = 60;
  const cy = 60;
  const rOuter = 54;
  const rInner = 49;
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
    const x1 = cx + Math.cos(angle) * rInner;
    const y1 = cy + Math.sin(angle) * rInner;
    const x2 = cx + Math.cos(angle) * rOuter;
    const y2 = cy + Math.sin(angle) * rOuter;
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', String(x1));
    line.setAttribute('y1', String(y1));
    line.setAttribute('x2', String(x2));
    line.setAttribute('y2', String(y2));
    line.setAttribute('class', 'pomo-tick');
    g.appendChild(line);
  }
}

export function initPomodoro() {
  const el = document.getElementById('pomodoro-widget');
  if (!el) return;

  const display = el.querySelector('.pomo-time');
  const label = el.querySelector('.pomo-label');
  const ring = el.querySelector('.pomo-ring-progress');
  const svg = el.querySelector('.pomo-ring svg');
  const startBtn = el.querySelector('.pomo-start');
  const resetBtn = el.querySelector('.pomo-reset');
  const workInput = el.querySelector('.pomo-work');
  const breakInput = el.querySelector('.pomo-break');

  drawTicks(svg);

  workSec = Number(persistence.get('pomodoroWork', 25)) * 60;
  breakSec = Number(persistence.get('pomodoroBreak', 5)) * 60;
  remaining = workSec;

  if (workInput) workInput.value = String(workSec / 60);
  if (breakInput) breakInput.value = String(breakSec / 60);

  function total() {
    return isWork ? workSec : breakSec;
  }

  function updateUI() {
    if (display) display.textContent = formatDuration(remaining);
    if (label) label.textContent = isWork ? 'Focus' : 'Break';
    el.classList.toggle('is-break', !isWork);
    el.classList.toggle('is-low-time', remaining > 0 && remaining <= 60);

    if (ring) {
      const pct = 1 - remaining / total();
      const circumference = 2 * Math.PI * 54;
      ring.style.strokeDasharray = `${circumference}`;
      ring.style.strokeDashoffset = `${circumference * (1 - pct)}`;
    }
  }

  function tick() {
    if (remaining > 0) {
      remaining--;
      updateUI();
    } else {
      isWork = !isWork;
      remaining = total();
      updateUI();
    }
  }

  startBtn?.addEventListener('click', () => {
    running = !running;
    setPlayPauseIcon(startBtn, running);
    if (running) {
      timerId = setInterval(tick, 1000);
    } else {
      clearInterval(timerId);
    }
  });

  resetBtn?.addEventListener('click', () => {
    running = false;
    clearInterval(timerId);
    isWork = true;
    remaining = workSec;
    setPlayPauseIcon(startBtn, false);
    updateUI();
  });

  workInput?.addEventListener('change', () => {
    workSec = Math.max(1, Number(workInput.value) || 25) * 60;
    persistence.set('pomodoroWork', workSec / 60);
    if (!running && isWork) remaining = workSec;
    updateUI();
  });

  breakInput?.addEventListener('change', () => {
    breakSec = Math.max(1, Number(breakInput.value) || 5) * 60;
    persistence.set('pomodoroBreak', breakSec / 60);
    if (!running && !isWork) remaining = breakSec;
    updateUI();
  });

  persistence.subscribe((key) => {
    if (key === 'pomodoroWork' || key === '*') {
      workSec = Number(persistence.get('pomodoroWork', 25)) * 60;
      if (workInput) workInput.value = String(workSec / 60);
      if (!running && isWork) remaining = workSec;
      updateUI();
    }
    if (key === 'pomodoroBreak' || key === '*') {
      breakSec = Number(persistence.get('pomodoroBreak', 5)) * 60;
      if (breakInput) breakInput.value = String(breakSec / 60);
      if (!running && !isWork) remaining = breakSec;
      updateUI();
    }
  });

  setPlayPauseIcon(startBtn, false);
  updateUI();
}
