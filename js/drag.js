/**
 * Draggable widgets with persisted positions.
 *
 * Positions are stored as viewport percentages so they survive
 * resolution changes. Dragging is disabled on the small-screen
 * grid layout and never triggers on interactive controls.
 */

import * as persistence from './persistence.js';
import { clamp } from './utils.js';

const INTERACTIVE = 'input, textarea, select, button, a, label, .note-text';
const GRID_BREAKPOINT = 1100;
const MARGIN = 16;

let active = null;
let startX = 0;
let startY = 0;
let originLeft = 0;
let originTop = 0;
let topZ = 10;

/**
 * @returns {Record<string, {left:string, top:string}>}
 */
function getPositions() {
  return /** @type {Record<string, {left:string, top:string}>} */ (
    persistence.get('widgetPositions', {})
  );
}

/**
 * Apply a stored position to a widget element.
 * @param {HTMLElement} el
 * @param {{left:string, top:string}} pos
 */
function applyPosition(el, pos) {
  if (!pos) return;
  el.style.left = pos.left;
  el.style.top = pos.top;
  el.style.right = 'auto';
  el.style.bottom = 'auto';
}

/**
 * Restore all saved positions.
 */
export function applySavedPositions() {
  if (window.innerWidth <= GRID_BREAKPOINT) return;
  const positions = getPositions();
  document.querySelectorAll('.widget[data-widget]').forEach((el) => {
    const id = el.dataset.widget;
    if (positions[id]) applyPosition(el, positions[id]);
  });
}

/**
 * Initialize dragging on all widgets.
 */
export function initDrag() {
  const widgets = document.querySelectorAll('.widget[data-widget]');
  widgets.forEach((el) => {
    el.addEventListener('pointerdown', onPointerDown);
  });

  applySavedPositions();

  persistence.subscribe((key) => {
    if (key === 'widgetPositions' || key === '*') applySavedPositions();
  });

  window.addEventListener('resize', applySavedPositions);
}

/**
 * @param {PointerEvent} e
 */
function onPointerDown(e) {
  if (e.button !== 0) return;
  if (window.innerWidth <= GRID_BREAKPOINT) return;
  if (e.target.closest(INTERACTIVE)) return;

  const widget = /** @type {HTMLElement} */ (e.currentTarget);
  const rect = widget.getBoundingClientRect();

  active = widget;
  startX = e.clientX;
  startY = e.clientY;
  originLeft = rect.left;
  originTop = rect.top;

  widget.classList.add('is-dragging');
  widget.style.zIndex = String(++topZ);
  try {
    widget.setPointerCapture(e.pointerId);
  } catch {
    /* synthetic events may not support pointer capture */
  }

  widget.addEventListener('pointermove', onPointerMove);
  widget.addEventListener('pointerup', onPointerUp);
  widget.addEventListener('pointercancel', onPointerUp);
}

/**
 * @param {PointerEvent} e
 */
function onPointerMove(e) {
  if (!active) return;

  const dx = e.clientX - startX;
  const dy = e.clientY - startY;
  const w = active.offsetWidth;
  const h = active.offsetHeight;

  const left = clamp(originLeft + dx, MARGIN - w + 80, window.innerWidth - 80);
  const top = clamp(originTop + dy, MARGIN, window.innerHeight - 60);

  active.style.left = `${left}px`;
  active.style.top = `${top}px`;
  active.style.right = 'auto';
  active.style.bottom = 'auto';
}

/**
 * @param {PointerEvent} e
 */
function onPointerUp(e) {
  if (!active) return;

  const widget = active;
  widget.classList.remove('is-dragging');
  widget.releasePointerCapture?.(e.pointerId);
  widget.removeEventListener('pointermove', onPointerMove);
  widget.removeEventListener('pointerup', onPointerUp);
  widget.removeEventListener('pointercancel', onPointerUp);

  const rect = widget.getBoundingClientRect();
  const leftPct = `${((rect.left / window.innerWidth) * 100).toFixed(2)}%`;
  const topPct = `${((rect.top / window.innerHeight) * 100).toFixed(2)}%`;

  widget.style.left = leftPct;
  widget.style.top = topPct;

  const positions = { ...getPositions(), [widget.dataset.widget]: { left: leftPct, top: topPct } };
  persistence.set('widgetPositions', positions);

  active = null;
}

/**
 * Clear all saved positions and revert to CSS defaults.
 */
export function resetPositions() {
  persistence.set('widgetPositions', {});
  document.querySelectorAll('.widget[data-widget]').forEach((el) => {
    el.style.left = '';
    el.style.top = '';
    el.style.right = '';
    el.style.bottom = '';
  });
}

export default { initDrag, applySavedPositions, resetPositions };
