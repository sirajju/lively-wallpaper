import { getGreeting } from '../utils.js';

const QUOTES = [
  'Code is like humor. When you have to explain it, it\'s bad.',
  'First, solve the problem. Then, write the code.',
  'Simplicity is the soul of efficiency.',
  'Make it work, make it right, make it fast.',
  'The best error message is the one that never shows up.',
  'Programs must be written for people to read.',
  'Small steps every day lead to big results.',
  'Focus on progress, not perfection.',
  'Your only limit is your mind.',
  'Build things that matter.',
  'Consistency beats intensity.',
  'Deep work creates deep value.',
  'Rest is part of the process.',
];

let quoteIndex = 0;

export function initGreeting() {
  const el = document.getElementById('greeting-widget');
  if (!el) return;

  const greetingEl = el.querySelector('.greeting-text');
  const quoteEl = el.querySelector('.greeting-quote');

  function update() {
    if (greetingEl) greetingEl.textContent = getGreeting();
    if (quoteEl) quoteEl.textContent = `"${QUOTES[quoteIndex]}"`;
  }

  update();
  setInterval(() => {
    quoteIndex = (quoteIndex + 1) % QUOTES.length;
    if (quoteEl) {
      quoteEl.style.opacity = '0';
      setTimeout(() => {
        update();
        quoteEl.style.opacity = '1';
      }, 400);
    }
  }, 30000);

  setInterval(() => {
    if (greetingEl) greetingEl.textContent = getGreeting();
  }, 60000);
}
