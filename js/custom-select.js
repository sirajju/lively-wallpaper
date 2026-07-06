/**
 * Custom dropdown for native <select> elements.
 * Native OS selects do not work in Lively's WebView — this uses DOM buttons instead.
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
  select.tabIndex = -1;

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
  document.body.appendChild(popover);

  let ignoreOutsideClose = false;

  function getOptions() {
    return Array.from(select.options)
      .filter((opt) => !opt.disabled)
      .map((opt) => {
        const preset = PRIORITY_OPTIONS.find((p) => p.value === opt.value);
        return { value: opt.value, label: opt.textContent || opt.value, color: preset?.color };
      });
  }

  function renderTrigger() {
    const current = getOptions().find((o) => o.value === select.value)
      || { value: select.value, label: select.value };
    const dot = current.color ? `<span class="priority-dot" style="background:${current.color}"></span>` : '';
    btn.innerHTML = `${dot}<span class="custom-select-label">${current.label}</span><svg class="chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>`;
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
      row.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
      row.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
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
    const openUp = spaceBelow < 160 && rect.top > 160;
    popover.style.position = 'fixed';
    popover.style.left = `${Math.max(8, rect.left)}px`;
    popover.style.minWidth = `${Math.max(rect.width, 120)}px`;
    popover.style.maxWidth = `${Math.min(360, window.innerWidth - 16)}px`;
    popover.style.zIndex = '260';
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

  function onDocumentPointer(e) {
    if (ignoreOutsideClose) return;
    const target = /** @type {Node} */ (e.target);
    if (wrap.contains(target) || popover.contains(target)) return;
    close();
  }

  btn.addEventListener('mousedown', (e) => {
    e.preventDefault();
    e.stopPropagation();
  });

  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (popover.hidden) {
      ignoreOutsideClose = true;
      open();
      window.setTimeout(() => {
        ignoreOutsideClose = false;
      }, 0);
    } else {
      close();
    }
  });

  document.addEventListener('mousedown', onDocumentPointer);
  window.addEventListener('resize', () => {
    if (!popover.hidden) positionPopover();
  });

  wrap.append(btn);
  renderTrigger();
  select.addEventListener('change', renderTrigger);
}

/**
 * Enhance every native select inside a container (skips already-enhanced).
 * @param {ParentNode} [root]
 */
export function enhanceSelectsIn(root = document) {
  root.querySelectorAll('select:not([data-enhanced])').forEach((sel) => {
    if (sel instanceof HTMLSelectElement) enhanceSelect(sel);
  });
}

export function initCustomSelects() {
  enhanceSelectsIn(document.getElementById('settings-panel'));
  enhanceSelectsIn(document.getElementById('widget-popover-backdrop'));
  document.querySelectorAll('select.todo-priority, select.wc-add-select').forEach((sel) => {
    if (sel instanceof HTMLSelectElement) enhanceSelect(sel);
  });
}

export default { enhanceSelect, enhanceSelectsIn, initCustomSelects };
