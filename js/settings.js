/**
 * Floating settings panel for Aurora Desk.
 */

import * as persistence from './persistence.js';
import { readFileAsText } from './utils.js';
import { getSoundOptions } from './ambient.js';
import { setMode } from './background.js';
import { applyTheme } from './theme.js';
import { toggleWidgetVisibility } from './focus-mode.js';
import { resetPositions, applySavedPositions } from './drag.js';
import { setIcon } from './icons.js';
import { getSizeOptions, getCurrentSizeKey, setWidgetSize } from './widget-sizes.js';
import {
  hasWidgetSettings,
  renderWidgetSettings,
  WIDGET_SETTING_KEYS,
} from './widget-settings.js';

const BG_MODES = [
  'aurora',
  'mountains',
  'space',
  'ocean',
  'cyberpunk',
  'minimal',
  'sunset',
  'northern-lights',
];

const WIDGETS = [
  'clock', 'greeting', 'weather', 'calendar', 'pomodoro', 'stopwatch',
  'countdown', 'todo', 'notes', 'spotify', 'github', 'system',
  'worldclock', 'events', 'radar', 'rss', 'motivation',
];

const WIDGETS_PER_PAGE = 9;

/** @type {number} */
let widgetPage = 0;

export function initSettings() {
  const panel = document.getElementById('settings-panel');
  const toggle = document.getElementById('settings-toggle');
  const closeBtn = panel?.querySelector('.settings-close');
  const backdrop = document.getElementById('settings-backdrop');

  if (!panel || !toggle) return;

  function openPanel() {
    panel.classList.add('is-open');
    backdrop?.classList.add('is-open');
    panel.setAttribute('aria-hidden', 'false');
  }

  function closePanel() {
    panel.classList.remove('is-open');
    backdrop?.classList.remove('is-open');
    panel.setAttribute('aria-hidden', 'true');
    closeWidgetPopover();
  }

  toggle.addEventListener('click', () => {
    if (panel.classList.contains('is-open')) closePanel();
    else openPanel();
  });

  closeBtn?.addEventListener('click', closePanel);
  backdrop?.addEventListener('click', closePanel);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closePanel();
  });

  initSettingsTabs(panel);
  initWidgetPager(panel);
  bindControls(panel);
  applySettings();
  buildWidgetCards(panel);

  persistence.subscribe((key) => {
    applySettings();
    if (key === 'widgetSpans' || key === 'hiddenWidgets' || key === '*') {
      buildWidgetCards(panel);
    }
    if (key === '*' || WIDGET_SETTING_KEYS.has(key)) {
      refreshOpenWidgetPopover();
    }
  });
}

function initSettingsTabs(panel) {
  const tabs = panel.querySelectorAll('.settings-tab');
  const pages = panel.querySelectorAll('.settings-page');

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const id = tab.getAttribute('data-tab');
      if (!id) return;

      tabs.forEach((t) => {
        const active = t === tab;
        t.classList.toggle('is-active', active);
        t.setAttribute('aria-selected', active ? 'true' : 'false');
      });

      pages.forEach((page) => {
        const active = page.getAttribute('data-page') === id;
        page.classList.toggle('is-active', active);
        page.hidden = !active;
      });
    });
  });
}

function initWidgetPager(panel) {
  const prev = panel.querySelector('.widgets-page-prev');
  const next = panel.querySelector('.widgets-page-next');

  prev?.addEventListener('click', () => {
    widgetPage = Math.max(0, widgetPage - 1);
    buildWidgetCards(panel);
  });

  next?.addEventListener('click', () => {
    const maxPage = Math.ceil(WIDGETS.length / WIDGETS_PER_PAGE) - 1;
    widgetPage = Math.min(maxPage, widgetPage + 1);
    buildWidgetCards(panel);
  });
}

function bindControls(panel) {
  bind(panel, '#set-accent', 'accentColor', (el) => el.value, (v) => v);
  bind(panel, '#set-opacity', 'glassOpacity', (el) => Number(el.value) / 100, (v) => Math.round(v * 100));
  bind(panel, '#set-blur', 'blurAmount', (el) => Number(el.value), (v) => v);
  bind(panel, '#set-scale', 'widgetScale', (el) => Number(el.value) / 100, (v) => Math.round(v * 100));
  bind(panel, '#set-anim-speed', 'animationSpeed', (el) => Number(el.value) / 100, (v) => Math.round(v * 100));
  bind(panel, '#set-time-24', 'timeFormat24', (el) => el.checked, (v) => v);
  bind(panel, '#set-focus', 'focusMode', (el) => el.checked, (v) => v);

  const units = panel.querySelector('#set-units');
  units?.addEventListener('change', () => {
    persistence.set('weatherUnits', units.value);
  });

  const font = panel.querySelector('#set-font');
  font?.addEventListener('change', () => {
    persistence.set('fontFamily', font.value);
    applyFont(font.value);
  });

  const bg = panel.querySelector('#set-background');
  bg?.addEventListener('change', () => {
    persistence.set('backgroundMode', bg.value);
    setMode(bg.value);
  });

  const ambient = panel.querySelector('#set-ambient');
  ambient?.addEventListener('change', () => {
    persistence.set('ambientSound', ambient.value);
  });

  const ambVol = panel.querySelector('#set-ambient-vol');
  ambVol?.addEventListener('input', () => {
    persistence.set('ambientVolume', Number(ambVol.value) / 100);
  });

  panel.querySelector('#export-state')?.addEventListener('click', () => {
    handleExport();
  });

  panel.querySelector('#reset-layout')?.addEventListener('click', () => {
    resetPositions();
  });

  const importFile = document.getElementById('import-state-file');
  importFile?.addEventListener('change', async () => {
    const file = importFile.files?.[0];
    const status = document.getElementById('data-status');
    if (!file) return;
    try {
      const ok = persistence.importJSON(await readFileAsText(file));
      if (!ok) {
        if (status) status.textContent = 'Import failed — choose a valid Aurora Desk JSON file.';
        return;
      }
      applySettings();
      applySavedPositions();
      if (status) {
        status.textContent = 'Import applied successfully.';
        window.setTimeout(() => {
          if (status.textContent === 'Import applied successfully.') status.textContent = '';
        }, 3000);
      }
    } catch {
      if (status) status.textContent = 'Could not read that file.';
    } finally {
      importFile.value = '';
    }
  });

  if (ambient) {
    getSoundOptions().forEach((s) => {
      const opt = document.createElement('option');
      opt.value = s;
      opt.textContent = s.charAt(0).toUpperCase() + s.slice(1);
      ambient.appendChild(opt);
    });
  }

  if (bg) {
    BG_MODES.forEach((m) => {
      const opt = document.createElement('option');
      opt.value = m;
      opt.textContent = m.replace('-', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      bg.appendChild(opt);
    });
  }

  initExportOverlay();
}

async function handleExport() {
  const status = document.getElementById('data-status');
  try {
    const { copied, downloaded } = await persistence.performExport();

    if (copied) {
      if (status) {
        status.textContent = downloaded
          ? 'Copied to clipboard and download started.'
          : 'Copied to clipboard — paste into Lively Saved State.';
      }
    } else if (status) {
      status.textContent = 'Copy the JSON below (or use the copy button).';
    }
  } catch {
    if (status) status.textContent = 'Export failed — try again.';
  }
}

function initExportOverlay() {
  persistence.setExportFallback(showExportOverlay);

  const overlay = document.getElementById('export-overlay');
  const output = document.getElementById('export-json-output');
  const copyBtn = document.getElementById('export-copy-btn');
  const closeBtn = overlay?.querySelector('.export-dialog-close');

  const close = () => {
    if (!overlay) return;
    overlay.hidden = true;
    overlay.setAttribute('aria-hidden', 'true');
  };

  closeBtn?.addEventListener('click', close);
  overlay?.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  copyBtn?.addEventListener('click', async () => {
    const text = output?.value || '';
    if (!text) return;
    const copied = await persistence.copyTextToClipboard(text);
    const status = document.getElementById('data-status');
    if (status) {
      status.textContent = copied
        ? 'Copied to clipboard.'
        : 'Select the text, then press Ctrl+C.';
    }
    if (copied) close();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay && !overlay.hidden) close();
  });
}

function showExportOverlay(json) {
  const overlay = document.getElementById('export-overlay');
  const output = document.getElementById('export-json-output');
  if (!overlay || !output) return;
  output.value = json;
  overlay.hidden = false;
  overlay.setAttribute('aria-hidden', 'false');
  output.focus();
  output.select();
}

function bind(panel, selector, key, read, write) {
  const el = panel.querySelector(selector);
  if (!el) return;
  el.addEventListener('input', () => persistence.set(key, read(el)));
  el.addEventListener('change', () => persistence.set(key, read(el)));
}

function applySettings() {
  const root = document.documentElement;
  const accent = String(persistence.get('accentColor', '#8B5CF6'));
  const opacity = Number(persistence.get('glassOpacity', 0.22));
  const blur = Number(persistence.get('blurAmount', 24));
  const scale = Number(persistence.get('widgetScale', 1));
  const anim = Number(persistence.get('animationSpeed', 1));

  root.style.setProperty('--glass-opacity', String(opacity));
  root.style.setProperty('--glass-blur', `${blur}px`);
  root.style.setProperty('--widget-scale', String(scale));
  root.style.setProperty('--anim-speed', String(anim));

  applyTheme(accent);

  const panel = document.getElementById('settings-panel');
  setVal(panel, '#set-accent', accent);
  setVal(panel, '#set-opacity', Math.round(opacity * 100));
  setVal(panel, '#set-blur', blur);
  setVal(panel, '#set-scale', Math.round(scale * 100));
  setVal(panel, '#set-anim-speed', Math.round(anim * 100));
  setCheck(panel, '#set-time-24', persistence.get('timeFormat24'));
  setCheck(panel, '#set-focus', persistence.get('focusMode'));
  setVal(panel, '#set-units', persistence.get('weatherUnits', 'celsius'));
  setVal(panel, '#set-font', persistence.get('fontFamily', 'system'));
  setVal(panel, '#set-background', persistence.get('backgroundMode', 'aurora'));
  setVal(panel, '#set-ambient', persistence.get('ambientSound', 'none'));
  setVal(panel, '#set-ambient-vol', Math.round(Number(persistence.get('ambientVolume', 0.3)) * 100));

  applyFont(String(persistence.get('fontFamily', 'system')));
  setMode(String(persistence.get('backgroundMode', 'aurora')));
}

function setVal(root, sel, val) {
  const el = root?.querySelector(sel);
  if (el && 'value' in el) el.value = String(val);
}

function setCheck(root, sel, val) {
  const el = root?.querySelector(sel);
  if (el && 'checked' in el) el.checked = Boolean(val);
}

function applyFont(family) {
  const map = {
    system: 'var(--font-ui)',
    inter: '"Inter", var(--font-ui)',
    georgia: 'Georgia, "Times New Roman", serif',
    mono: '"Cascadia Code", "Fira Code", Consolas, monospace',
  };
  document.documentElement.style.setProperty('--font-family', map[family] || map.system);
}

function buildWidgetCards(panel) {
  const container = panel.querySelector('.widget-toggles');
  if (!container) return;

  const pageCount = Math.ceil(WIDGETS.length / WIDGETS_PER_PAGE);
  widgetPage = Math.min(widgetPage, Math.max(0, pageCount - 1));

  const label = panel.querySelector('.widgets-page-label');
  if (label) label.textContent = `${widgetPage + 1} / ${pageCount}`;

  const prev = panel.querySelector('.widgets-page-prev');
  const next = panel.querySelector('.widgets-page-next');
  if (prev) prev.disabled = widgetPage <= 0;
  if (next) next.disabled = widgetPage >= pageCount - 1;

  const slice = WIDGETS.slice(
    widgetPage * WIDGETS_PER_PAGE,
    widgetPage * WIDGETS_PER_PAGE + WIDGETS_PER_PAGE,
  );

  const hidden = new Set(persistence.get('hiddenWidgets', []));
  const sizeOptions = getSizeOptions();
  container.innerHTML = '';

  slice.forEach((id) => {
    const cell = document.createElement('div');
    cell.className = 'widget-cell';

    const labelEl = document.createElement('label');
    labelEl.className = 'widget-toggle';
    labelEl.innerHTML = `
      <input type="checkbox" data-widget-toggle="${id}" ${hidden.has(id) ? '' : 'checked'}>
      <span>${id.replace(/-/g, ' ')}</span>
    `;

    const controls = document.createElement('div');
    controls.className = 'widget-row-controls';

    const sizeSelect = document.createElement('select');
    sizeSelect.className = 'widget-size-select';
    sizeSelect.setAttribute('data-widget-size', id);
    sizeSelect.setAttribute('aria-label', `Size for ${id}`);
    const current = getCurrentSizeKey(id);
    const opts = [...sizeOptions];
    if (current === 'custom') opts.push({ value: 'custom', label: 'Custom' });
    opts.forEach((opt) => {
      const option = document.createElement('option');
      option.value = opt.value;
      option.textContent = opt.label;
      if (opt.value === current) option.selected = true;
      if (opt.value === 'custom') option.disabled = true;
      sizeSelect.appendChild(option);
    });

    controls.appendChild(sizeSelect);

    if (hasWidgetSettings(id)) {
      const settingsBtn = document.createElement('button');
      settingsBtn.type = 'button';
      settingsBtn.className = 'btn-icon btn-ghost widget-settings-toggle';
      settingsBtn.setAttribute('data-widget-settings', id);
      settingsBtn.setAttribute('aria-label', `Settings for ${id}`);
      settingsBtn.title = 'Widget settings';
      settingsBtn.innerHTML = '';
      setIcon(settingsBtn, 'settings', 14);
      controls.appendChild(settingsBtn);
    }

    cell.append(labelEl, controls);
    container.appendChild(cell);
  });

  container.querySelectorAll('[data-widget-toggle]').forEach((input) => {
    input.addEventListener('change', () => {
      const widgetId = input.getAttribute('data-widget-toggle');
      toggleWidgetVisibility(widgetId, !input.checked);
    });
  });

  container.querySelectorAll('[data-widget-size]').forEach((select) => {
    select.addEventListener('change', () => {
      const widgetId = select.getAttribute('data-widget-size');
      if (widgetId) setWidgetSize(widgetId, select.value);
    });
  });

  container.querySelectorAll('[data-widget-settings]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const widgetId = btn.getAttribute('data-widget-settings');
      if (widgetId) openWidgetPopover(widgetId);
    });
  });
}

/** Lazily create the floating per-widget settings popover. */
function ensureWidgetPopover() {
  let backdrop = document.getElementById('widget-popover-backdrop');
  if (backdrop) return backdrop;

  backdrop = document.createElement('div');
  backdrop.id = 'widget-popover-backdrop';
  backdrop.className = 'widget-popover-backdrop';
  backdrop.innerHTML = `
    <div class="widget-popover" role="dialog" aria-modal="true">
      <header class="widget-popover-header">
        <h3 class="widget-popover-title"></h3>
        <button class="icon-btn widget-popover-close" aria-label="Close" title="Close">×</button>
      </header>
      <div class="widget-popover-body"></div>
    </div>
  `;
  document.body.appendChild(backdrop);

  const close = () => closeWidgetPopover();
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) close();
  });
  backdrop.querySelector('.widget-popover-close')?.addEventListener('click', close);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });

  return backdrop;
}

function openWidgetPopover(id) {
  const backdrop = ensureWidgetPopover();
  const title = backdrop.querySelector('.widget-popover-title');
  const body = backdrop.querySelector('.widget-popover-body');
  if (title) title.textContent = id.replace(/-/g, ' ');
  if (body) renderWidgetSettings(id, /** @type {HTMLElement} */ (body));
  backdrop.setAttribute('data-widget', id);
  backdrop.classList.add('is-open');
}

function closeWidgetPopover() {
  const backdrop = document.getElementById('widget-popover-backdrop');
  backdrop?.classList.remove('is-open');
  backdrop?.removeAttribute('data-widget');
}

/** Re-render the popover if the open widget's data changed. */
function refreshOpenWidgetPopover() {
  const backdrop = document.getElementById('widget-popover-backdrop');
  if (!backdrop || !backdrop.classList.contains('is-open')) return;
  const id = backdrop.getAttribute('data-widget');
  const body = backdrop.querySelector('.widget-popover-body');
  if (id && body) renderWidgetSettings(id, /** @type {HTMLElement} */ (body));
}

export default { initSettings };
