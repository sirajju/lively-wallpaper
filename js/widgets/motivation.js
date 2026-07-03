const QUOTES = [
  'Done is better than perfect.',
  'Action cures fear.',
  'You don\'t have to be great to start.',
  'Discipline is choosing between what you want now and what you want most.',
  'The secret of getting ahead is getting started.',
  'Energy flows where attention goes.',
  'One task at a time.',
  'Clarity comes from engagement, not thought.',
  'Ship early, iterate often.',
  'Protect your focus like a treasure.',
  'Break big problems into small wins.',
  'Your future self will thank you.',
  'Stay curious. Stay building.',
  'Quiet progress beats loud procrastination.',
  'Excellence is a habit.',
];

let idx = 0;

export function initMotivation() {
  const el = document.getElementById('motivation-widget');
  if (!el) return;

  const quoteEl = el.querySelector('.motivation-quote');

  function show() {
    if (!quoteEl) return;
    quoteEl.style.opacity = '0';
    setTimeout(() => {
      quoteEl.textContent = `"${QUOTES[idx]}"`;
      quoteEl.style.opacity = '1';
    }, 350);
  }

  show();
  setInterval(() => {
    idx = (idx + 1) % QUOTES.length;
    show();
  }, 20000);

  el.querySelector('.motivation-next')?.addEventListener('click', () => {
    idx = (idx + 1) % QUOTES.length;
    show();
  });
}
