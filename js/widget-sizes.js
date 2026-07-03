/**
 * Widget sizing for the modular dock grid.
 *
 * Source of truth is `widgetSpans`: an explicit { cols, rows } footprint per
 * widget on the 12×8 grid. This lets a widget be resized in width only, height
 * only, or both. Named presets (XS…XL) are shortcuts that set a span.
 */

import * as persistence from './persistence.js';

/** @typedef {'xs'|'sm'|'md'|'lg'|'xl'} SizeKey */

export const GRID_COLS = 12;
export const GRID_ROWS = 8;

/** Grid span [cols, rows] per named preset. */
export const SIZE_PRESETS = {
  xs: { cols: 2, rows: 2, label: 'XS' },
  sm: { cols: 3, rows: 2, label: 'Small' },
  md: { cols: 4, rows: 3, label: 'Medium' },
  lg: { cols: 4, rows: 4, label: 'Large' },
  xl: { cols: 6, rows: 4, label: 'XL' },
};

/** Default preset per widget (content-appropriate). */
export const DEFAULT_WIDGET_SIZES = {
  clock: 'sm',
  greeting: 'sm',
  weather: 'sm',
  calendar: 'md',
  pomodoro: 'md',
  todo: 'md',
  stopwatch: 'xs',
  countdown: 'sm',
  notes: 'md',
  spotify: 'sm',
  github: 'lg',
  system: 'sm',
  worldclock: 'sm',
  events: 'md',
  radar: 'sm',
  rss: 'sm',
  motivation: 'sm',
};

const SIZE_KEYS = /** @type {SizeKey[]} */ (Object.keys(SIZE_PRESETS));

/**
 * @returns {Record<string, {cols:number, rows:number}>}
 */
export function getWidgetSpans() {
  return /** @type {Record<string, {cols:number, rows:number}>} */ (
    persistence.get('widgetSpans', {})
  );
}

/**
 * Current footprint [cols, rows] for a widget — explicit span or preset default.
 * @param {string} widgetId
 * @returns {[number, number]}
 */
export function getWidgetSpan(widgetId) {
  const span = getWidgetSpans()[widgetId];
  if (span && Number.isFinite(span.cols) && Number.isFinite(span.rows)) {
    return [span.cols, span.rows];
  }
  const preset = SIZE_PRESETS[DEFAULT_WIDGET_SIZES[widgetId] || 'md'];
  return [preset.cols, preset.rows];
}

/**
 * Persist an explicit footprint (used by drag-resize; allows any W/H).
 * @param {string} widgetId
 * @param {number} cols
 * @param {number} rows
 */
export function setWidgetSpan(widgetId, cols, rows) {
  const c = Math.max(1, Math.min(GRID_COLS, Math.round(cols)));
  const r = Math.max(1, Math.min(GRID_ROWS, Math.round(rows)));
  const spans = { ...getWidgetSpans(), [widgetId]: { cols: c, rows: r } };
  persistence.set('widgetSpans', spans);
}

/**
 * Apply a named preset size to a widget.
 * @param {string} widgetId
 * @param {SizeKey} sizeKey
 */
export function setWidgetSize(widgetId, sizeKey) {
  const preset = SIZE_PRESETS[sizeKey];
  if (!preset) return;
  setWidgetSpan(widgetId, preset.cols, preset.rows);
}

/**
 * The preset key matching a widget's current span, or 'custom'.
 * @param {string} widgetId
 * @returns {SizeKey|'custom'}
 */
export function getCurrentSizeKey(widgetId) {
  const [cols, rows] = getWidgetSpan(widgetId);
  for (const key of SIZE_KEYS) {
    const p = SIZE_PRESETS[key];
    if (p.cols === cols && p.rows === rows) return key;
  }
  return 'custom';
}

/**
 * Apply size data attribute + class to a widget element.
 * @param {HTMLElement} el
 */
export function syncWidgetSizeAttr(el) {
  const id = el.dataset.widget;
  if (!id) return;
  const key = getCurrentSizeKey(id);
  el.dataset.size = key;
  el.classList.remove('size-xs', 'size-sm', 'size-md', 'size-lg', 'size-xl', 'size-custom');
  el.classList.add(`size-${key}`);
}

/**
 * Options for the settings size dropdown.
 * @returns {{value: string, label: string}[]}
 */
export function getSizeOptions() {
  return SIZE_KEYS.map((key) => ({ value: key, label: SIZE_PRESETS[key].label }));
}

export default {
  GRID_COLS,
  GRID_ROWS,
  SIZE_PRESETS,
  DEFAULT_WIDGET_SIZES,
  getWidgetSpans,
  getWidgetSpan,
  setWidgetSpan,
  setWidgetSize,
  getCurrentSizeKey,
  syncWidgetSizeAttr,
  getSizeOptions,
};
