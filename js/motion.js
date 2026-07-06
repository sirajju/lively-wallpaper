/**
 * Lightweight motion utilities (entrance, hover helpers).
 */

import { prefersReducedMotion } from './utils.js';

const SPRING = 'cubic-bezier(0.16, 1, 0.3, 1)';

/**
 * Staggered widget entrance on load.
 */
export function initEntranceMotion() {
  if (prefersReducedMotion) return;

  const widgets = Array.from(document.querySelectorAll('.widget:not(.widget-hidden)'));
  widgets.forEach((el, i) => {
    if (!(el instanceof HTMLElement)) return;
    el.style.opacity = '0';
    el.style.transform = 'translateY(12px) scale(var(--widget-scale))';
    requestAnimationFrame(() => {
      el.style.transition = `opacity 0.5s ${SPRING} ${i * 40}ms, transform 0.5s ${SPRING} ${i * 40}ms, box-shadow 0.25s ${SPRING}`;
      el.style.opacity = '1';
      el.style.transform = 'translateY(0) scale(var(--widget-scale))';
    });
  });
}

/**
 * @param {HTMLElement} el
 * @param {() => void} update
 */
export function crossfadeBlur(el, update) {
  if (!el || prefersReducedMotion) {
    update();
    return;
  }
  el.style.transition = 'opacity 0.2s ease, filter 0.2s ease';
  el.style.opacity = '0';
  el.style.filter = 'blur(6px)';
  setTimeout(() => {
    update();
    requestAnimationFrame(() => {
      el.style.opacity = '1';
      el.style.filter = 'blur(0)';
    });
  }, 200);
}

export default { initEntranceMotion, crossfadeBlur };
