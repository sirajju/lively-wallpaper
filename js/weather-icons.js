/**
 * Animated weather condition icons (CSS-driven SVG).
 */

import { iconSvg } from './icons.js';

/** @type {Record<string, string>} */
const CONDITION_ICONS = {
  clear: 'sun',
  partly: 'cloud-sun',
  fog: 'cloud-fog',
  drizzle: 'cloud-rain',
  rain: 'cloud-rain',
  snow: 'cloud-snow',
  storm: 'cloud-lightning',
  default: 'thermometer',
};

/**
 * @param {number} code WMO weather code
 * @returns {string}
 */
export function weatherConditionKey(code) {
  if (code === 0) return 'clear';
  if (code <= 3) return 'partly';
  if (code <= 48) return 'fog';
  if (code <= 57) return 'drizzle';
  if (code <= 67) return 'rain';
  if (code <= 77) return 'snow';
  if (code <= 86) return 'snow';
  if (code <= 99) return 'storm';
  return 'default';
}

/**
 * @param {HTMLElement} el
 * @param {number} code
 */
export function renderWeatherIcon(el, code) {
  if (!el) return;
  const key = weatherConditionKey(code);
  const iconName = CONDITION_ICONS[key] || CONDITION_ICONS.default;
  el.className = `weather-icon weather-icon--${key}`;
  el.innerHTML = iconSvg(iconName, 40);
}

/**
 * @param {HTMLElement} el
 * @param {number} tempC
 */
export function applyTempGradient(el, tempC) {
  if (!el) return;
  const t = Math.max(-10, Math.min(40, tempC));
  const cold = 1 - (t + 10) / 50;
  const warm = (t + 10) / 50;
  el.style.setProperty('--temp-cold', String(cold));
  el.style.setProperty('--temp-warm', String(warm));
}

export default { renderWeatherIcon, applyTempGradient, weatherConditionKey };
