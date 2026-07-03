/**
 * Floating settings panel for Aurora Desk.
 */

import * as persistence from './persistence.js';
import { readFileAsText } from './utils.js';
import { getSoundOptions } from './ambient.js';
import { setMode } from './background.js';
import { toggleWidgetVisibility } from './focus-mode.js';
import { resetPositions } from './drag.js';

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

  bindControls(panel);
  applySettings();
  buildWidgetToggles(panel);

  persistence.subscribe(() => applySettings());
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
    persistence.downloadExport();
  });

  panel.querySelector('#reset-layout')?.addEventListener('click', () => {
    resetPositions();
  });

  const importFile = panel.querySelector('#import-state-file');
  panel.querySelector('#import-state')?.addEventListener('click', () => importFile?.click());
  importFile?.addEventListener('change', async () => {
    const file = importFile.files?.[0];
    if (!file) return;
    const ok = persistence.importJSON(await readFileAsText(file));
    if (ok) applySettings();
    importFile.value = '';
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
  const opacity = Number(persistence.get('glassOpacity', 0.72));
  const blur = Number(persistence.get('blurAmount', 20));
  const scale = Number(persistence.get('widgetScale', 1));
  const anim = Number(persistence.get('animationSpeed', 1));

  root.style.setProperty('--accent', accent);
  root.style.setProperty('--glass-opacity', String(opacity));
  root.style.setProperty('--glass-blur', `${blur}px`);
  root.style.setProperty('--widget-scale', String(scale));
  root.style.setProperty('--anim-speed', String(anim));

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
    system: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    inter: '"Inter", -apple-system, sans-serif',
    georgia: 'Georgia, "Times New Roman", serif',
    mono: '"Cascadia Code", "Fira Code", Consolas, monospace',
  };
  document.documentElement.style.setProperty('--font-family', map[family] || map.system);
}

function buildWidgetToggles(panel) {
  const container = panel.querySelector('.widget-toggles');
  if (!container) return;

  const hidden = new Set(persistence.get('hiddenWidgets', []));
  container.innerHTML = '';

  WIDGETS.forEach((id) => {
    const label = document.createElement('label');
    label.className = 'widget-toggle';
    label.innerHTML = `
      <input type="checkbox" data-widget-toggle="${id}" ${hidden.has(id) ? '' : 'checked'}>
      <span>${id.replace(/-/g, ' ')}</span>
    `;
    container.appendChild(label);
  });

  container.querySelectorAll('[data-widget-toggle]').forEach((input) => {
    input.addEventListener('change', () => {
      const id = input.getAttribute('data-widget-toggle');
      toggleWidgetVisibility(id, !input.checked);
    });
  });
}

export default { initSettings };
