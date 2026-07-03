/**
 * Animated aurora background with blobs, particles, parallax, and modes.
 */

import { prefersReducedMotion, randomBetween, clamp, lerp } from './utils.js';
import * as persistence from './persistence.js';

const MODES = {
  aurora: {
    colors: ['#E0E7FF', '#C4B5FD', '#93C5FD', '#FBCFE8', '#A5F3FC'],
    blobs: 5,
  },
  mountains: {
    colors: ['#F8FAFC', '#CBD5E1', '#94A3B8', '#E2E8F0', '#BAE6FD'],
    blobs: 3,
  },
  space: {
    colors: ['#0F172A', '#1E1B4B', '#312E81', '#4C1D95', '#6366F1'],
    blobs: 6,
  },
  ocean: {
    colors: ['#E0F2FE', '#7DD3FC', '#38BDF8', '#BAE6FD', '#A5F3FC'],
    blobs: 4,
  },
  cyberpunk: {
    colors: ['#FDF2F8', '#F472B6', '#A78BFA', '#22D3EE', '#F9A8D4'],
    blobs: 5,
  },
  minimal: {
    colors: ['#FFFFFF', '#F8FAFC', '#F1F5F9', '#E2E8F0', '#FAFAFA'],
    blobs: 2,
  },
  sunset: {
    colors: ['#FFF7ED', '#FDBA74', '#FB923C', '#F9A8D4', '#FDE68A'],
    blobs: 4,
  },
  'northern-lights': {
    colors: ['#ECFDF5', '#6EE7B7', '#34D399', '#A78BFA', '#67E8F9'],
    blobs: 6,
  },
};

let canvas;
let ctx;
let particles = [];
let blobs = [];
let mouse = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };
let animationId = null;
let isPaused = false;
let speed = 1;
let mode = 'aurora';

/**
 * Initialize background engine.
 */
export function initBackground() {
  canvas = document.getElementById('bg-canvas');
  if (!canvas) return;
  ctx = canvas.getContext('2d', { alpha: true });
  resize();
  window.addEventListener('resize', resize);
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('click', onRipple);

  persistence.subscribe((key, val) => {
    if (key === 'backgroundMode' || key === '*') setMode(persistence.get('backgroundMode', 'aurora'));
    if (key === 'animationSpeed' || key === '*') speed = Number(persistence.get('animationSpeed', 1));
  });

  setMode(persistence.get('backgroundMode', 'aurora'));
  speed = Number(persistence.get('animationSpeed', 1));

  const prevPlayback = window.livelyWallpaperPlaybackChanged;
  window.livelyWallpaperPlaybackChanged = function livelyWallpaperPlaybackChanged(data) {
    try {
      const obj = JSON.parse(data);
      isPaused = Boolean(obj.IsPaused);
      if (isPaused) cancelAnimationFrame(animationId);
      else if (!animationId) loop();
    } catch {
      /* noop */
    }
    if (typeof prevPlayback === 'function') prevPlayback(data);
  };

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(animationId);
      animationId = null;
    } else if (!isPaused) loop();
  });

  if (!prefersReducedMotion) loop();
  else drawFrame(0);
}

/**
 * @param {string} newMode
 */
export function setMode(newMode) {
  mode = MODES[newMode] ? newMode : 'aurora';
  document.body.dataset.bgMode = mode;
  initBlobs();
  initParticles();
  applyCssVars();
}

function applyCssVars() {
  const cfg = MODES[mode];
  const root = document.documentElement;
  cfg.colors.forEach((c, i) => root.style.setProperty(`--bg-c${i + 1}`, c));
}

function resize() {
  if (!canvas) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function initBlobs() {
  const cfg = MODES[mode];
  blobs = Array.from({ length: cfg.blobs }, (_, i) => ({
    x: randomBetween(0.1, 0.9),
    y: randomBetween(0.1, 0.9),
    r: randomBetween(120, 280),
    color: cfg.colors[i % cfg.colors.length],
    phase: randomBetween(0, Math.PI * 2),
    speed: randomBetween(0.0002, 0.0006),
  }));
}

function initParticles() {
  particles = Array.from({ length: 60 }, () => ({
    x: Math.random(),
    y: Math.random(),
    size: randomBetween(1, 2.5),
    alpha: randomBetween(0.15, 0.5),
    speed: randomBetween(0.00005, 0.0002),
  }));
}

function onMouseMove(e) {
  mouse.tx = e.clientX / window.innerWidth;
  mouse.ty = e.clientY / window.innerHeight;
}

function onRipple(e) {
  const ripple = document.createElement('div');
  ripple.className = 'ripple';
  ripple.style.left = `${e.clientX}px`;
  ripple.style.top = `${e.clientY}px`;
  document.getElementById('ripple-layer')?.appendChild(ripple);
  ripple.addEventListener('animationend', () => ripple.remove());
}

function loop() {
  animationId = requestAnimationFrame((t) => {
    drawFrame(t);
    if (!isPaused && !document.hidden) loop();
    else animationId = null;
  });
}

function drawFrame(time) {
  if (!ctx || !canvas) return;
  const w = window.innerWidth;
  const h = window.innerHeight;

  mouse.x = lerp(mouse.x, mouse.tx, 0.04);
  mouse.y = lerp(mouse.y, mouse.ty, 0.04);

  const grad = ctx.createLinearGradient(0, 0, w, h);
  const cfg = MODES[mode];
  cfg.colors.forEach((c, i) => grad.addColorStop(i / (cfg.colors.length - 1), c));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  const parallaxX = (mouse.x - 0.5) * 30;
  const parallaxY = (mouse.y - 0.5) * 30;

  blobs.forEach((blob, i) => {
    const bx = (blob.x + Math.sin(time * blob.speed * speed + blob.phase) * 0.04) * w + parallaxX * (i % 2 ? 1 : -1);
    const by = (blob.y + Math.cos(time * blob.speed * speed * 0.8 + blob.phase) * 0.03) * h + parallaxY * (i % 2 ? -1 : 1);
    const radius = blob.r * (1 + Math.sin(time * 0.0004 * speed + i) * 0.08);

    const g = ctx.createRadialGradient(bx, by, 0, bx, by, radius);
    g.addColorStop(0, blob.color + '99');
    g.addColorStop(0.5, blob.color + '44');
    g.addColorStop(1, blob.color + '00');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(bx, by, radius, 0, Math.PI * 2);
    ctx.fill();
  });

  particles.forEach((p) => {
    p.y -= p.speed * speed * 60;
    if (p.y < 0) p.y = 1;
    const px = p.x * w + parallaxX * 0.3;
    const py = p.y * h;
    ctx.fillStyle = `rgba(255,255,255,${p.alpha})`;
    ctx.beginPath();
    ctx.arc(px, py, p.size, 0, Math.PI * 2);
    ctx.fill();
  });

  if (mode === 'northern-lights' || mode === 'aurora') {
    drawLightRays(time, w, h);
  }
}

function drawLightRays(time, w, h) {
  const count = 3;
  for (let i = 0; i < count; i++) {
    const x = w * (0.2 + i * 0.3) + Math.sin(time * 0.0003 * speed + i) * 40;
    const g = ctx.createLinearGradient(x, 0, x + 80, h);
    g.addColorStop(0, 'rgba(167,139,250,0)');
    g.addColorStop(0.4, 'rgba(103,232,249,0.08)');
    g.addColorStop(1, 'rgba(167,139,250,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - 40, 0, 120, h);
  }
}

export default { initBackground, setMode };
