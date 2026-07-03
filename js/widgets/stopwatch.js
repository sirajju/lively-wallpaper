import { formatDuration } from '../utils.js';

let elapsed = 0;
let running = false;
let timerId = null;
let lapStart = 0;

export function initStopwatch() {
  const el = document.getElementById('stopwatch-widget');
  if (!el) return;

  const display = el.querySelector('.sw-time');
  const startBtn = el.querySelector('.sw-start');
  const lapBtn = el.querySelector('.sw-lap');
  const resetBtn = el.querySelector('.sw-reset');
  const lapsEl = el.querySelector('.sw-laps');

  function update() {
    if (display) display.textContent = formatDuration(elapsed / 1000);
  }

  function setPlayBtn(btn, isRunning, hasStarted) {
    if (!btn) return;
    if (isRunning) {
      btn.textContent = '⏸';
      btn.setAttribute('aria-label', 'Pause');
      btn.title = 'Pause';
    } else {
      btn.textContent = '▶';
      const label = hasStarted ? 'Resume' : 'Start';
      btn.setAttribute('aria-label', label);
      btn.title = label;
    }
  }

  startBtn?.addEventListener('click', () => {
    running = !running;
    setPlayBtn(startBtn, running, elapsed > 0);
    if (running) {
      lapStart = Date.now() - elapsed;
      timerId = setInterval(() => {
        elapsed = Date.now() - lapStart;
        update();
      }, 50);
    } else {
      clearInterval(timerId);
    }
  });

  lapBtn?.addEventListener('click', () => {
    if (!lapsEl) return;
    const lap = document.createElement('div');
    lap.className = 'sw-lap-item';
    lap.textContent = formatDuration(elapsed / 1000);
    lapsEl.prepend(lap);
    if (lapsEl.children.length > 5) lapsEl.lastChild?.remove();
  });

  resetBtn?.addEventListener('click', () => {
    running = false;
    clearInterval(timerId);
    elapsed = 0;
    setPlayBtn(startBtn, false, false);
    if (lapsEl) lapsEl.innerHTML = '';
    update();
  });

  update();
}
