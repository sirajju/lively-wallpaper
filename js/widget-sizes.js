/**
 * Standard widget sizes for the modular dock grid.
 *
 * Every widget uses one of five presets so blocks interlock cleanly.
 * Sizes map to grid cell spans on the 12×8 desk grid.
 */

import * as persistence from './persistence.js';

/** @typedef {'xs'|'sm'|'md'|'lg'|'xl'} WidgetSize */

/** Grid span [cols, rows] per size preset. */
export const SIZE_PRESETS = {
  xs: { cols: 2, rows: 2, label: 'XS' },
  sm: { cols: 3, rows: 2, label: 'Small' },
  md: { cols: 4, rows: 3, label: 'Medium' },
  lg: { cols: 4, rows: 4, label: 'Large' },
  xl: { cols: 6, rows: 4, label: 'XL' },
};

/** Default size per widget (content-appropriate). */
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

const SIZE_KEYS = /** @type {WidgetSize[]} */ (Object.keys(SIZE_PRESETS));

/**
 * @returns {Record<string, WidgetSize>}
 */
export function getWidgetSizes() {
  return /** @type {Record<string, WidgetSize>} */ (
    persistence.get('widgetSizes', {})
  );
}

/**
 * @param {string} widgetId
 * @returns {WidgetSize}
 */
export function getWidgetSize(widgetId) {
  const saved = getWidgetSizes()[widgetId];
  if (saved && SIZE_PRESETS[saved]) return saved;
  return /** @type {WidgetSize} */ (DEFAULT_WIDGET_SIZES[widgetId] || 'md');
}

/**
 * @param {string} widgetId
 * @returns {[number, number]}
 */
export function getWidgetSpan(widgetId) {
  const preset = SIZE_PRESETS[getWidgetSize(widgetId)];
  return [preset.cols, preset.rows];
}

/**
 * @param {string} widgetId
 * @param {WidgetSize} size
 */
export function setWidgetSize(widgetId, size) {
  if (!SIZE_PRESETS[size]) return;
  const sizes = { ...getWidgetSizes(), [widgetId]: size };
  persistence.set('widgetSizes', sizes);
}

/**
 * Apply size class + data attribute to a widget element.
 * @param {HTMLElement} el
 */
export function syncWidgetSizeAttr(el) {
  const id = el.dataset.widget;
  if (!id) return;
  const size = getWidgetSize(id);
  el.dataset.size = size;
  el.classList.remove('size-xs', 'size-sm', 'size-md', 'size-lg', 'size-xl');
  el.classList.add(`size-${size}`);
}

/**
 * Nearest standard size to a (possibly fractional) cell span.
 * @param {number} cols
 * @param {number} rows
 * @returns {WidgetSize}
 */
export function nearestSize(cols, rows) {
  let best = /** @type {WidgetSize} */ ('md');
  let bestDist = Infinity;
  for (const key of SIZE_KEYS) {
    const p = SIZE_PRESETS[key];
    const d = (p.cols - cols) ** 2 + (p.rows - rows) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = key;
    }
  }
  return best;
}

/**
 * Options for settings dropdowns.
 * @returns {{value: WidgetSize, label: string}[]}
 */
export function getSizeOptions() {
  return SIZE_KEYS.map((key) => ({
    value: key,
    label: SIZE_PRESETS[key].label,
  }));
}

export default {
  SIZE_PRESETS,
  DEFAULT_WIDGET_SIZES,
  getWidgetSize,
  getWidgetSpan,
  setWidgetSize,
  syncWidgetSizeAttr,
  getSizeOptions,
  nearestSize,
};
