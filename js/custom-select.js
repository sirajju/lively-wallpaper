/**
 * Custom dropdown for native <select> elements (Floating UI–style positioning).
 */

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low', color: '#64748b' },
  { value: 'medium', label: 'Medium', color: '#f59e0b' },
  { value: 'high', label: 'High', color: '#f43f5e' },
];

/**
 * @param {HTMLSelectElement} select
 */
export function enhanceSelect(select) {
  if (!select || select.dataset.enhanced) return;
  select.dataset.enhanced = 'true';
  select.classList.add('native-select-hidden');

  const wrap = document.createElement('div');
  wrap.className = 'custom-select';
  select.parentNode?.insertBefore(wrap, select);
  wrap.appendChild(select);

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'custom-select-trigger input-glass';
  btn.setAttribute('aria-haspopup', 'listbox');
  btn.setAttribute('aria-expanded', 'false');

  const popover = document.createElement('div');
  popover.className = 'custom-select-popover';
  popover.setAttribute('role', 'listbox');
  popover.hidden = true;

  function getOptions() {
    return Array.from(select.options).map((opt) => {
      const preset = PRIORITY_OPTIONS.find((p) => p.value === opt.value);
      return { value: opt.value, label: opt.textContent || opt.value, color: preset?.color };
    });
  }

  function renderTrigger() {
    const current = getOptions().find((o) => o.value === select.value);
    const dot = current?.color ? `<span class="priority-dot" style="background:${current.color}"></span>` : '';
    btn.innerHTML = `${dot}<span>${current?.label || select.value}</span><svg class="chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>`;
  }

  function renderPopover() {
    popover.innerHTML = '';
    getOptions().forEach((opt) => {
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'custom-select-option';
      row.setAttribute('role', 'option');
      row.dataset.value = opt.value;
      if (opt.value === select.value) row.setAttribute('aria-selected', 'true');
      const dot = opt.color ? `<span class="priority-dot" style="background:${opt.color}"></span>` : '';
      row.innerHTML = `${dot}<span>${opt.label}</span>`;
      row.addEventListener('click', () => {
        select.value = opt.value;
        select.dispatchEvent(new Event('change', { bubbles: true }));
        close();
        renderTrigger();
      });
      popover.appendChild(row);
    });
  }

  function positionPopover() {
    const rect = btn.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < 140 && rect.top > 140;
    popover.style.position = 'fixed';
    popover.style.left = `${rect.left}px`;
    popover.style.minWidth = `${rect.width}px`;
    popover.style.zIndex = '300';
    if (openUp) {
      popover.style.bottom = `${window.innerHeight - rect.top + 4}px`;
      popover.style.top = 'auto';
    } else {
      popover.style.top = `${rect.bottom + 4}px`;
      popover.style.bottom = 'auto';
    }
  }

  function open() {
    renderPopover();
    popover.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    wrap.classList.add('is-open');
    positionPopover();
  }

  function close() {
    popover.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
    wrap.classList.remove('is-open');
  }

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (popover.hidden) open();
    else close();
  });

  document.addEventListener('click', close);
  window.addEventListener('resize', () => { if (!popover.hidden) positionPopover(); });

  wrap.append(btn, popover);
  renderTrigger();

  select.addEventListener('change', renderTrigger);
}

export function initCustomSelects() {
  document.querySelectorAll('select.todo-priority, select.wc-add-select').forEach((sel) => {
    if (sel instanceof HTMLSelectElement) enhanceSelect(sel);
  });
}

export default { enhanceSelect, initCustomSelects };
