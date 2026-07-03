import { formatDuration } from '../utils.js';
import * as persistence from '../persistence.js';

let workSec = 25 * 60;
let breakSec = 5 * 60;
let remaining = workSec;
let isWork = true;
let running = false;
let timerId = null;

export function initPomodoro() {
  const el = document.getElementById('pomodoro-widget');
  if (!el) return;

  const display = el.querySelector('.pomo-time');
  const label = el.querySelector('.pomo-label');
  const ring = el.querySelector('.pomo-ring-progress');
  const startBtn = el.querySelector('.pomo-start');
  const resetBtn = el.querySelector('.pomo-reset');
  const workInput = el.querySelector('.pomo-work');
  const breakInput = el.querySelector('.pomo-break');

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

  function setPlayBtn(btn, isRunning) {
    if (!btn) return;
    btn.textContent = isRunning ? '⏸' : '▶';
    const label = isRunning ? 'Pause' : 'Start';
    btn.setAttribute('aria-label', label);
    btn.title = label;
  }

  startBtn?.addEventListener('click', () => {
    running = !running;
    setPlayBtn(startBtn, running);
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
    setPlayBtn(startBtn, false);
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

  updateUI();
}
