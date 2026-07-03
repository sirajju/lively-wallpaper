/**
 * Dockable widgets — modular grid docking (Lego-style).
 *
 * The desk is a 12×8 grid. Each widget spans a whole number of cells and
 * is RESIZED to fill them, so every docked widget shares the same column
 * widths / row heights and interlocks cleanly with uniform gaps — instead
 * of aligning ragged edges of mismatched sizes.
 *
 * Uses mouse events (Lively's WebView forwards these reliably). A drag only
 * starts once the pointer moves past a threshold, so a plain click never
 * moves or resizes a widget.
 *
 * Positions persist as { col, row }; the grid is recomputed in pixels on
 * every layout change so it stays responsive.
 */

import * as persistence from './persistence.js';
import { clamp } from './utils.js';

const INTERACTIVE = 'input, textarea, select, button, a, label, .note-text';
const GRID_BREAKPOINT = 1100;
const COLS = 12;
const ROWS = 8;
const GAP = 14;
const DRAG_THRESHOLD = 4;

/** Cell span (cols × rows) per widget — all 4 cols wide for a uniform 3-per-row grid. */
const SPANS = {
  clock: [4, 2],
  greeting: [4, 2],
  weather: [4, 3],
  calendar: [4, 4],
  pomodoro: [4, 4],
  todo: [4, 5],
  stopwatch: [4, 3],
  countdown: [4, 3],
  notes: [4, 4],
  spotify: [4, 3],
  github: [4, 5],
  system: [4, 3],
  worldclock: [4, 3],
  events: [4, 4],
  radar: [4, 3],
  rss: [4, 2],
  motivation: [4, 2],
};

/** Default non-overlapping cells for the widgets shown by default (3 columns). */
const DEFAULT_DOCKS = {
  clock: [0, 0],
  greeting: [4, 0],
  weather: [8, 0],
  calendar: [0, 2],
  pomodoro: [4, 2],
  todo: [8, 3],
  rss: [4, 6],
  motivation: [0, 6],
  events: [8, 3],
  notes: [4, 2],
  countdown: [0, 2],
  spotify: [8, 3],
  github: [0, 2],
  stopwatch: [8, 6],
  system: [8, 6],
  worldclock: [4, 6],
  radar: [8, 6],
};

let active = null;
let moved = false;
let startX = 0;
let startY = 0;
let grabLocalX = 0;
let grabLocalY = 0;
let topZ = 10;

let guideLayer = null;
let highlightEl = null;

/**
 * @returns {Record<string, {col:number, row:number}>}
 */
function getDocks() {
  return /** @type {Record<string, {col:number, row:number}>} */ (
    persistence.get('widgetDocks', {})
  );
}

function deskEl() {
  return document.querySelector('.desk');
}

/**
 * Grid geometry in the desk's local (offset-parent) coordinate space.
 */
function gridMetrics() {
  const desk = deskEl();
  const rect = desk.getBoundingClientRect();
  const cs = getComputedStyle(desk);
  const padL = parseFloat(cs.paddingLeft) || 0;
  const padR = parseFloat(cs.paddingRight) || 0;
  const padT = parseFloat(cs.paddingTop) || 0;
  const padB = parseFloat(cs.paddingBottom) || 0;

  const gridW = desk.clientWidth - padL - padR;
  const gridH = desk.clientHeight - padT - padB;
  const colW = (gridW - GAP * (COLS - 1)) / COLS;
  const rowH = (gridH - GAP * (ROWS - 1)) / ROWS;

  return { rect, padL, padT, colW, rowH };
}

/**
 * @param {HTMLElement} el
 * @returns {[number, number]}
 */
function spanOf(el) {
  const id = el.dataset.widget ?? '';
  const s = SPANS[id] || [3, 3];
  return [clamp(s[0], 1, COLS), clamp(s[1], 1, ROWS)];
}

/**
 * Convert a cell to a local-space box (left/top/width/height in px).
 * @param {number} col
 * @param {number} row
 * @param {number} spanC
 * @param {number} spanR
 * @param {ReturnType<typeof gridMetrics>} m
 */
function cellBox(col, row, spanC, spanR, m) {
  return {
    left: m.padL + col * (m.colW + GAP),
    top: m.padT + row * (m.rowH + GAP),
    width: spanC * m.colW + (spanC - 1) * GAP,
    height: spanR * m.rowH + (spanR - 1) * GAP,
  };
}

/**
 * Size and place a widget into a grid cell.
 * @param {HTMLElement} el
 * @param {number} col
 * @param {number} row
 * @param {ReturnType<typeof gridMetrics>} m
 */
function placeInCell(el, col, row, m) {
  const [spanC, spanR] = spanOf(el);
  const box = cellBox(col, row, spanC, spanR, m);
  el.style.left = `${box.left}px`;
  el.style.top = `${box.top}px`;
  el.style.width = `${box.width}px`;
  el.style.height = `${box.height}px`;
  el.style.minWidth = '0';
  el.style.maxHeight = 'none';
  el.style.right = 'auto';
  el.style.bottom = 'auto';
  el.dataset.col = String(col);
  el.dataset.row = String(row);
}

/**
 * Do two cell rectangles overlap?
 */
function overlaps(c1, r1, w1, h1, c2, r2, w2, h2) {
  return c1 < c2 + w2 && c1 + w1 > c2 && r1 < r2 + h2 && r1 + h1 > r2;
}

/**
 * Is a cell free of all other visible widgets?
 * @param {string} excludeId
 */
function isFree(col, row, spanC, spanR, occupied, excludeId) {
  if (col < 0 || row < 0 || col + spanC > COLS || row + spanR > ROWS) return false;
  for (const o of occupied) {
    if (o.id === excludeId) continue;
    if (overlaps(col, row, spanC, spanR, o.col, o.row, o.spanC, o.spanR)) return false;
  }
  return true;
}

/**
 * Nearest free cell to a target via expanding-ring search.
 */
function nearestFree(col, row, spanC, spanR, occupied, excludeId) {
  if (isFree(col, row, spanC, spanR, occupied, excludeId)) return { col, row };
  for (let radius = 1; radius <= Math.max(COLS, ROWS); radius++) {
    for (let dr = -radius; dr <= radius; dr++) {
      for (let dc = -radius; dc <= radius; dc++) {
        if (Math.abs(dc) !== radius && Math.abs(dr) !== radius) continue;
        const c = clamp(col + dc, 0, COLS - spanC);
        const r = clamp(row + dr, 0, ROWS - spanR);
        if (isFree(c, r, spanC, spanR, occupied, excludeId)) return { col: c, row: r };
      }
    }
  }
  return { col: clamp(col, 0, COLS - spanC), row: clamp(row, 0, ROWS - spanR) };
}

/**
 * Collect occupied cells from all visible widgets.
 */
function occupiedCells(excludeEl) {
  const occ = [];
  document.querySelectorAll('.widget[data-widget]').forEach((el) => {
    if (el === excludeEl || el.classList.contains('widget-hidden')) return;
    if (el.dataset.col == null || el.dataset.row == null) return;
    const [spanC, spanR] = spanOf(el);
    occ.push({
      id: el.dataset.widget,
      col: Number(el.dataset.col),
      row: Number(el.dataset.row),
      spanC,
      spanR,
    });
  });
  return occ;
}

/**
 * Apply saved / default docks to every visible widget, resizing to cells.
 */
export function applySavedPositions() {
  if (window.innerWidth <= GRID_BREAKPOINT) return;

  const m = gridMetrics();
  const docks = getDocks();
  const placed = [];

  document.querySelectorAll('.widget[data-widget]').forEach((el) => {
    const id = el.dataset.widget;
    if (!id || el.classList.contains('widget-hidden')) return;

    const [spanC, spanR] = spanOf(el);
    let target = docks[id] || DEFAULT_DOCKS[id] || { col: 0, row: 0 };
    let col = Array.isArray(target) ? target[0] : target.col;
    let row = Array.isArray(target) ? target[1] : target.row;

    const slot = nearestFree(col, row, spanC, spanR, placed, id);
    placeInCell(el, slot.col, slot.row, m);
    placed.push({ id, col: slot.col, row: slot.row, spanC, spanR });
  });
}

function ensureGuideLayer() {
  if (guideLayer) return;
  guideLayer = document.createElement('div');
  guideLayer.className = 'snap-guides';
  highlightEl = document.createElement('div');
  highlightEl.className = 'dock-highlight';
  guideLayer.appendChild(highlightEl);
  document.body.appendChild(guideLayer);
}

function showHighlight(box, m, invalid) {
  ensureGuideLayer();
  highlightEl.style.opacity = '1';
  highlightEl.style.left = `${m.rect.left + box.left}px`;
  highlightEl.style.top = `${m.rect.top + box.top}px`;
  highlightEl.style.width = `${box.width}px`;
  highlightEl.style.height = `${box.height}px`;
  highlightEl.classList.toggle('is-invalid', !!invalid);
}

function hideHighlight() {
  if (highlightEl) highlightEl.style.opacity = '0';
}

/**
 * Initialize dockable dragging on all widgets.
 */
export function initDrag() {
  ensureGuideLayer();

  document.querySelectorAll('.widget[data-widget]').forEach((el) => {
    el.addEventListener('mousedown', onMouseDown);
  });

  applySavedPositions();

  persistence.subscribe((key) => {
    if (key === 'widgetDocks' || key === 'hiddenWidgets' || key === '*') applySavedPositions();
  });

  window.addEventListener('resize', applySavedPositions);
}

/**
 * @param {MouseEvent} e
 */
function onMouseDown(e) {
  if (e.button !== 0) return;
  if (window.innerWidth <= GRID_BREAKPOINT) return;
  if (e.target.closest(INTERACTIVE)) return;

  const widget = /** @type {HTMLElement} */ (e.currentTarget);
  const m = gridMetrics();

  active = widget;
  moved = false;
  startX = e.clientX;
  startY = e.clientY;
  // Grab offset within the widget, in local coordinates.
  grabLocalX = e.clientX - m.rect.left - widget.offsetLeft;
  grabLocalY = e.clientY - m.rect.top - widget.offsetTop;

  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
}

/**
 * @param {MouseEvent} e
 */
function onMouseMove(e) {
  if (!active) return;

  if (!moved) {
    if (Math.abs(e.clientX - startX) < DRAG_THRESHOLD && Math.abs(e.clientY - startY) < DRAG_THRESHOLD) {
      return;
    }
    // Real drag begins now.
    moved = true;
    active.classList.add('is-dragging');
    active.style.zIndex = String(++topZ);
    document.body.classList.add('is-docking');
    e.preventDefault();
  }

  const m = gridMetrics();
  const [spanC, spanR] = spanOf(active);

  // Desired top-left in local coords, following the grab point.
  const localLeft = e.clientX - m.rect.left - grabLocalX;
  const localTop = e.clientY - m.rect.top - grabLocalY;

  // Free-follow the cursor while dragging (in px)...
  active.style.left = `${localLeft}px`;
  active.style.top = `${localTop}px`;
  active.style.width = `${spanC * m.colW + (spanC - 1) * GAP}px`;
  active.style.height = `${spanR * m.rowH + (spanR - 1) * GAP}px`;
  active.style.minWidth = '0';
  active.style.maxHeight = 'none';
  active.style.right = 'auto';
  active.style.bottom = 'auto';

  // ...and preview the target cell it will snap into.
  const col = clamp(Math.round((localLeft - m.padL) / (m.colW + GAP)), 0, COLS - spanC);
  const row = clamp(Math.round((localTop - m.padT) / (m.rowH + GAP)), 0, ROWS - spanR);
  const occ = occupiedCells(active);
  const free = isFree(col, row, spanC, spanR, occ, active.dataset.widget);
  showHighlight(cellBox(col, row, spanC, spanR, m), m, !free);
}

/**
 * @param {MouseEvent} e
 */
function onMouseUp() {
  if (!active) return;

  const widget = active;
  window.removeEventListener('mousemove', onMouseMove);
  window.removeEventListener('mouseup', onMouseUp);

  if (!moved) {
    // Plain click — do not move, resize, or persist.
    active = null;
    return;
  }

  widget.classList.remove('is-dragging');
  hideHighlight();
  document.body.classList.remove('is-docking');

  const m = gridMetrics();
  const [spanC, spanR] = spanOf(widget);
  const localLeft = parseFloat(widget.style.left) || 0;
  const localTop = parseFloat(widget.style.top) || 0;
  const col = clamp(Math.round((localLeft - m.padL) / (m.colW + GAP)), 0, COLS - spanC);
  const row = clamp(Math.round((localTop - m.padT) / (m.rowH + GAP)), 0, ROWS - spanR);

  const occ = occupiedCells(widget);
  const slot = nearestFree(col, row, spanC, spanR, occ, widget.dataset.widget);

  widget.classList.add('is-snapping');
  placeInCell(widget, slot.col, slot.row, m);
  setTimeout(() => widget.classList.remove('is-snapping'), 260);

  const id = widget.dataset.widget;
  if (id) {
    const docks = { ...getDocks(), [id]: { col: slot.col, row: slot.row } };
    persistence.set('widgetDocks', docks);
  }

  active = null;
}

/**
 * Reset to the default modular layout.
 */
export function resetPositions() {
  persistence.set('widgetDocks', {});
  persistence.set('widgetPositions', {});
  document.querySelectorAll('.widget[data-widget]').forEach((el) => {
    el.style.width = '';
    el.style.height = '';
    el.style.minWidth = '';
    el.style.maxHeight = '';
    el.style.zIndex = '';
    delete el.dataset.col;
    delete el.dataset.row;
  });
  applySavedPositions();
}

export default { initDrag, applySavedPositions, resetPositions };
