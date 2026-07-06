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
    x: randomBetween(0.05, 0.95),
    y: randomBetween(0.05, 0.95),
    r: randomBetween(160, 360),
    color: cfg.colors[i % cfg.colors.length],
    phase: randomBetween(0, Math.PI * 2),
    speed: randomBetween(0.0003, 0.0008),
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

  mouse.x = lerp(mouse.x, mouse.tx, 0.06);
  mouse.y = lerp(mouse.y, mouse.ty, 0.06);

  const grad = ctx.createLinearGradient(0, 0, w, h);
  const cfg = MODES[mode];
  cfg.colors.forEach((c, i) => grad.addColorStop(i / (cfg.colors.length - 1), c));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  const parallaxX = (mouse.x - 0.5) * 50;
  const parallaxY = (mouse.y - 0.5) * 50;

  ctx.globalCompositeOperation = 'screen';
  blobs.forEach((blob, i) => {
    const drift = Math.sin(time * blob.speed * speed + blob.phase) * 0.06;
    const bx = (blob.x + drift) * w + parallaxX * (0.6 + (i % 3) * 0.2) * (i % 2 ? 1 : -1);
    const by = (blob.y + Math.cos(time * blob.speed * speed * 0.7 + blob.phase) * 0.05) * h + parallaxY * (0.5 + (i % 2) * 0.25) * (i % 2 ? -1 : 1);
    const radius = blob.r * (1.1 + Math.sin(time * 0.0005 * speed + i) * 0.12);

    const g = ctx.createRadialGradient(bx, by, 0, bx, by, radius);
    g.addColorStop(0, blob.color + 'cc');
    g.addColorStop(0.45, blob.color + '66');
    g.addColorStop(1, blob.color + '00');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(bx, by, radius, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalCompositeOperation = 'source-over';

  particles.forEach((p, i) => {
    p.y -= p.speed * speed * 80;
    p.x += Math.sin(time * 0.001 * speed + i) * 0.00008;
    if (p.y < 0) {
      p.y = 1;
      p.x = Math.random();
    }
    const twinkle = 0.35 + Math.sin(time * 0.003 * speed + i * 1.7) * 0.25;
    const px = p.x * w + parallaxX * 0.35;
    const py = p.y * h + parallaxY * 0.2;
    ctx.fillStyle = `rgba(255,255,255,${p.alpha * twinkle})`;
    ctx.beginPath();
    ctx.arc(px, py, p.size, 0, Math.PI * 2);
    ctx.fill();
  });

  if (mode === 'northern-lights' || mode === 'aurora') {
    drawLightRays(time, w, h);
  }

  drawVignette(w, h);
}

function drawVignette(w, h) {
  const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.25, w / 2, h / 2, Math.max(w, h) * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(15,23,42,0.22)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);
}

function drawLightRays(time, w, h) {
  const count = 5;
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < count; i++) {
    const x = w * (0.1 + i * 0.2) + Math.sin(time * 0.0004 * speed + i * 1.2) * 60;
    const sway = Math.sin(time * 0.00025 * speed + i) * 30;
    const g = ctx.createLinearGradient(x + sway, 0, x + sway + 100, h);
    g.addColorStop(0, 'rgba(167,139,250,0)');
    g.addColorStop(0.35, 'rgba(103,232,249,0.14)');
    g.addColorStop(0.7, 'rgba(167,139,250,0.06)');
    g.addColorStop(1, 'rgba(167,139,250,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x + sway - 50, 0, 160, h);
  }
  ctx.restore();
}

export default { initBackground, setMode };
