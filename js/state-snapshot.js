/**
 * Live DOM snapshot for full export — layout, visibility, and form fields
 * that may not yet be flushed to persistence.
 */

import * as persistence from './persistence.js';
import { getWidgetSpan } from './widget-sizes.js';

/**
 * Read current widget grid positions, spans, and visibility from the DOM.
 * @returns {Record<string, unknown>}
 */
export function captureLiveSnapshot() {
  const widgetDocks = { .../** @type {Record<string, {col:number, row:number}>} */ (
    persistence.get('widgetDocks', {})
  ) };
  const widgetSpans = { .../** @type {Record<string, {cols:number, rows:number}>} */ (
    persistence.get('widgetSpans', {})
  ) };

  document.querySelectorAll('.widget[data-widget]').forEach((el) => {
    const id = el.dataset.widget;
    if (!id) return;

    if (el.dataset.col != null && el.dataset.row != null) {
      widgetDocks[id] = {
        col: Number(el.dataset.col),
        row: Number(el.dataset.row),
      };
    }

    const [cols, rows] = getWidgetSpan(id);
    widgetSpans[id] = { cols, rows };
  });

  const hiddenWidgets = [];
  document.querySelectorAll('.widget[data-widget]').forEach((el) => {
    if (el.classList.contains('widget-hidden') && el.dataset.widget) {
      hiddenWidgets.push(el.dataset.widget);
    }
  });

  return {
    widgetDocks,
    widgetSpans,
    widgetPositions: { .../** @type {Record<string, unknown>} */ (
      persistence.get('widgetPositions', {})
    ) },
    hiddenWidgets,
    ...captureWidgetFormFields(),
    ...captureSettingsPanelFields(),
  };
}

/**
 * Widget inputs that may lag behind persistence until blur/change.
 * @returns {Record<string, unknown>}
 */
function captureWidgetFormFields() {
  /** @type {Record<string, unknown>} */
  const out = {};

  const work = document.querySelector('.pomo-work');
  const brk = document.querySelector('.pomo-break');
  if (work) out.pomodoroWork = Math.max(1, Number(work.value) || 25);
  if (brk) out.pomodoroBreak = Math.max(1, Number(brk.value) || 5);

  const gh = document.querySelector('.gh-username');
  if (gh) out.githubUsername = gh.value.trim();

  return out;
}

/**
 * Settings panel values (covers edits before input/change handlers fire).
 * @returns {Record<string, unknown>}
 */
function captureSettingsPanelFields() {
  /** @type {Record<string, unknown>} */
  const out = {};

  const accent = document.querySelector('#set-accent');
  if (accent?.value) out.accentColor = accent.value;

  const opacity = document.querySelector('#set-opacity');
  if (opacity) out.glassOpacity = Number(opacity.value) / 100;

  const blur = document.querySelector('#set-blur');
  if (blur) out.blurAmount = Number(blur.value);

  const scale = document.querySelector('#set-scale');
  if (scale) out.widgetScale = Number(scale.value) / 100;

  const anim = document.querySelector('#set-anim-speed');
  if (anim) out.animationSpeed = Number(anim.value) / 100;

  const bg = document.querySelector('#set-background');
  if (bg?.value) out.backgroundMode = bg.value;

  const font = document.querySelector('#set-font');
  if (font?.value) out.fontFamily = font.value;

  const units = document.querySelector('#set-units');
  if (units?.value) out.weatherUnits = units.value;

  const time24 = document.querySelector('#set-time-24');
  if (time24) out.timeFormat24 = time24.checked;

  const focus = document.querySelector('#set-focus');
  if (focus) out.focusMode = focus.checked;

  const ambient = document.querySelector('#set-ambient');
  if (ambient?.value) out.ambientSound = ambient.value;

  const ambVol = document.querySelector('#set-ambient-vol');
  if (ambVol) out.ambientVolume = Number(ambVol.value) / 100;

  return out;
}

export default { captureLiveSnapshot };
