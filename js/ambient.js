/**
 * Procedural ambient soundscapes via Web Audio API (offline-capable).
 */

import * as persistence from './persistence.js';

/** @type {AudioContext|null} */
let audioCtx = null;
/** @type {GainNode|null} */
let masterGain = null;
/** @type {AudioNode[]} */
let activeNodes = [];
let currentSound = 'none';

const SOUNDS = ['none', 'rain', 'forest', 'ocean', 'fireplace'];

/**
 * Initialize ambient audio system.
 */
export function initAmbient() {
  persistence.subscribe((key, val) => {
    if (key === 'ambientSound') setSound(String(val));
    if (key === 'ambientVolume') setVolume(Number(val));
  });

  setSound(String(persistence.get('ambientSound', 'none')));
  setVolume(Number(persistence.get('ambientVolume', 0.3)));
}

/**
 * @returns {string[]}
 */
export function getSoundOptions() {
  return SOUNDS;
}

/**
 * @param {string} sound
 */
export function setSound(sound) {
  currentSound = sound;
  stopAll();
  if (sound === 'none') return;
  ensureContext();
  if (!audioCtx || !masterGain) return;

  switch (sound) {
    case 'rain':
      startRain();
      break;
    case 'forest':
      startForest();
      break;
    case 'ocean':
      startOcean();
      break;
    case 'fireplace':
      startFireplace();
      break;
    default:
      break;
  }
}

/**
 * @param {number} volume 0-1
 */
export function setVolume(volume) {
  if (masterGain) masterGain.gain.value = clamp(volume, 0, 1);
}

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

function ensureContext() {
  if (audioCtx) return;
  try {
    audioCtx = new AudioContext();
    masterGain = audioCtx.createGain();
    masterGain.connect(audioCtx.destination);
    masterGain.gain.value = Number(persistence.get('ambientVolume', 0.3));
  } catch {
    audioCtx = null;
    masterGain = null;
  }
}

function stopAll() {
  activeNodes.forEach((n) => {
    try {
      n.disconnect();
    } catch {
      /* noop */
    }
  });
  activeNodes = [];
}

function createNoiseBuffer(type = 'white') {
  const bufferSize = audioCtx.sampleRate * 2;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < bufferSize; i++) {
    if (type === 'brown') {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    } else {
      data[i] = Math.random() * 2 - 1;
    }
  }
  return buffer;
}

function playNoiseLoop(buffer, filterFreq, gainValue) {
  const source = audioCtx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = filterFreq;
  const gain = audioCtx.createGain();
  gain.gain.value = gainValue;
  source.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain);
  source.start();
  activeNodes.push(source, filter, gain);
}

function startRain() {
  const buffer = createNoiseBuffer('white');
  playNoiseLoop(buffer, 800, 0.15);
  const drip = setInterval(() => {
    if (currentSound !== 'rain' || !audioCtx) return;
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.frequency.value = 400 + Math.random() * 600;
    g.gain.value = 0.02;
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
    osc.connect(g);
    g.connect(masterGain);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.06);
    activeNodes.push(osc, g);
  }, 180);
  activeNodes.push({ disconnect: () => clearInterval(drip) });
}

function startForest() {
  const buffer = createNoiseBuffer('brown');
  playNoiseLoop(buffer, 400, 0.08);
  const birds = setInterval(() => {
    if (currentSound !== 'forest' || !audioCtx) return;
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200 + Math.random() * 800, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, audioCtx.currentTime + 0.3);
    g.gain.value = 0.015;
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);
    osc.connect(g);
    g.connect(masterGain);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.4);
    activeNodes.push(osc, g);
  }, 2500);
  activeNodes.push({ disconnect: () => clearInterval(birds) });
}

function startOcean() {
  const buffer = createNoiseBuffer('brown');
  playNoiseLoop(buffer, 300, 0.12);
  const lfo = audioCtx.createOscillator();
  const lfoGain = audioCtx.createGain();
  lfo.frequency.value = 0.15;
  lfoGain.gain.value = 200;
  lfo.connect(lfoGain);
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 500;
  lfoGain.connect(filter.frequency);
  const source = audioCtx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  const gain = audioCtx.createGain();
  gain.gain.value = 0.1;
  source.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain);
  lfo.start();
  source.start();
  activeNodes.push(source, filter, gain, lfo, lfoGain);
}

function startFireplace() {
  const buffer = createNoiseBuffer('brown');
  playNoiseLoop(buffer, 600, 0.1);
  const crackle = setInterval(() => {
    if (currentSound !== 'fireplace' || !audioCtx) return;
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = 80 + Math.random() * 120;
    g.gain.value = 0.04;
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
    osc.connect(g);
    g.connect(masterGain);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.1);
    activeNodes.push(osc, g);
  }, 400);
  activeNodes.push({ disconnect: () => clearInterval(crackle) });
}

export default { initAmbient, setSound, setVolume, getSoundOptions };
