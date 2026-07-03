/**
 * Focus mode — hide non-essential widgets and soften the scene.
 */

import * as persistence from './persistence.js';

const ESSENTIAL = new Set(['clock', 'greeting', 'pomodoro', 'todo']);

/**
 * Initialize focus mode listener.
 */
export function initFocusMode() {
  persistence.subscribe((key) => {
    if (key === 'focusMode' || key === 'hiddenWidgets' || key === '*') apply();
  });
  apply();
}

function apply() {
  const enabled = Boolean(persistence.get('focusMode', false));
  document.body.classList.toggle('focus-mode', enabled);

  const hidden = new Set(persistence.get('hiddenWidgets', []));
  document.querySelectorAll('[data-widget]').forEach((el) => {
    const id = el.dataset.widget;
    const hide = enabled ? !ESSENTIAL.has(id) : hidden.has(id);
    el.classList.toggle('widget-hidden', hide);
    el.setAttribute('aria-hidden', hide ? 'true' : 'false');
  });
}

/**
 * @param {string} widgetId
 * @param {boolean} hidden
 */
export function toggleWidgetVisibility(widgetId, hidden) {
  const list = [...(persistence.get('hiddenWidgets', []))];
  const idx = list.indexOf(widgetId);
  if (hidden && idx === -1) list.push(widgetId);
  if (!hidden && idx !== -1) list.splice(idx, 1);
  persistence.set('hiddenWidgets', list);
  if (!persistence.get('focusMode')) apply();
}

export default { initFocusMode, toggleWidgetVisibility };
