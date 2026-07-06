/**
 * Accent-driven design tokens via chroma.js.
 */

import chroma from '../vendor/chroma-js/index.js';
import * as persistence from './persistence.js';

const WIDGET_HUE_OFFSETS = {
  clock: 0,
  greeting: 28,
  weather: -52,
  calendar: 14,
  pomodoro: -22,
  stopwatch: -95,
  countdown: 35,
  todo: 95,
  notes: 48,
  spotify: 110,
  github: -18,
  system: -42,
  worldclock: -72,
  events: 42,
  radar: -58,
  rss: 22,
  motivation: 18,
};

let styleEl;

/**
 * Apply full theme from accent hex.
 * @param {string} accentHex
 */
export function applyTheme(accentHex) {
  const base = chroma(accentHex);
  const [h, s, l] = base.hsl();
  const hue = Number.isFinite(h) ? h : 262;
  const sat = Number.isFinite(s) ? s : 0.83;
  const lit = Number.isFinite(l) ? l : 0.63;
  const satPct = `${Math.round(sat * 100)}%`;
  const litPct = `${Math.round(lit * 100)}%`;

  const root = document.documentElement;
  const complement = chroma.hsl((hue + 180) % 360, sat, lit);

  root.style.setProperty('--accent', accentHex);
  root.style.setProperty('--accent-h', String(Math.round(hue)));
  root.style.setProperty('--accent-s', satPct);
  root.style.setProperty('--accent-l', litPct);
  root.style.setProperty('--accent-complement', complement.hex());
  root.style.setProperty('--accent-light', base.brighten(0.85).hex());
  root.style.setProperty('--accent-soft', base.alpha(0.25).css());
  root.style.setProperty('--accent-glow', base.alpha(0.4).css());

  const glassOpacity = Number(persistence.get('glassOpacity', 0.22));
  root.style.setProperty('--glass-bg', `hsla(${Math.round(hue)}, 30%, 98%, ${glassOpacity})`);
  root.style.setProperty('--glass-bg-strong', `hsla(${Math.round(hue)}, 30%, 98%, ${Math.min(glassOpacity + 0.08, 0.35)})`);

  injectWidgetAccents(hue, sat, lit);
}

function injectWidgetAccents(baseHue, sat, lit) {
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'aurora-widget-accents';
    document.head.appendChild(styleEl);
  }

  const lines = Object.entries(WIDGET_HUE_OFFSETS).map(([widget, offset]) => {
    const h = (baseHue + offset + 360) % 360;
    const color = chroma.hsl(h, sat, lit).hex();
    return `[data-widget="${widget}"]{--w-accent:${color};}`;
  });

  styleEl.textContent = lines.join('\n');
}

export function initTheme() {
  persistence.subscribe((key) => {
    if (key === 'accentColor' || key === 'glassOpacity' || key === '*') {
      applyTheme(String(persistence.get('accentColor', '#8B5CF6')));
    }
  });
  applyTheme(String(persistence.get('accentColor', '#8B5CF6')));
}

export default { applyTheme, initTheme };
