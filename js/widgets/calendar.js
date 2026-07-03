export function initCalendar() {
  const el = document.getElementById('calendar-widget');
  if (!el) return;

  const gridEl = el.querySelector('.cal-grid');
  const monthEl = el.querySelector('.cal-month');
  const agendaEl = el.querySelector('.cal-agenda');

  function render() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const today = now.getDate();

    if (monthEl) {
      monthEl.textContent = now.toLocaleDateString([], { month: 'long', year: 'numeric' });
    }

    if (!gridEl) return;
    gridEl.innerHTML = '';

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    days.forEach((d) => {
      const h = document.createElement('div');
      h.className = 'cal-head';
      h.textContent = d;
      gridEl.appendChild(h);
    });

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++) {
      const blank = document.createElement('div');
      blank.className = 'cal-day cal-empty';
      gridEl.appendChild(blank);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const cell = document.createElement('div');
      cell.className = 'cal-day';
      const dow = new Date(year, month, d).getDay();
      if (dow === 0 || dow === 6) cell.classList.add('cal-weekend');
      if (d === today) cell.classList.add('cal-today');
      cell.textContent = String(d);
      gridEl.appendChild(cell);
    }

    if (agendaEl) {
      agendaEl.innerHTML = `
        <div class="agenda-item"><span class="agenda-time">Today</span><span>${now.toLocaleDateString([], { weekday: 'long' })}</span></div>
        <div class="agenda-item agenda-muted">Add events in the Events widget</div>
      `;
    }
  }

  render();
  setInterval(render, 60000);
}
