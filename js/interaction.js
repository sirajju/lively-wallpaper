/**
 * Subtle mouse interactions: cursor glow and parallax hook.
 */

import { prefersReducedMotion, lerp } from './utils.js';

let glowEl;
let mx = 0.5;
let my = 0.5;
let cx = 0.5;
let cy = 0.5;
let rafId = null;
let idleTimer = null;

export function initInteraction() {
  if (prefersReducedMotion) return;

  glowEl = document.getElementById('cursor-glow');
  if (!glowEl) return;

  document.addEventListener('mousemove', (e) => {
    mx = e.clientX / window.innerWidth;
    my = e.clientY / window.innerHeight;
    if (!rafId) rafId = requestAnimationFrame(loop);
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      cancelAnimationFrame(rafId);
      rafId = null;
    }, 2000);
  });

  document.addEventListener('mouseleave', () => {
    if (glowEl) glowEl.style.opacity = '0';
  });

  document.addEventListener('mouseenter', () => {
    if (glowEl) glowEl.style.opacity = '0.35';
  });
}

function loop() {
  cx = lerp(cx, mx, 0.08);
  cy = lerp(cy, my, 0.08);

  if (glowEl) {
    glowEl.style.left = `${cx * 100}%`;
    glowEl.style.top = `${cy * 100}%`;
  }

  if (rafId) rafId = requestAnimationFrame(loop);
}

export default { initInteraction };
