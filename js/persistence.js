/**
 * Persistence abstraction for Lively Wallpaper environments.
 * Avoids localStorage, sessionStorage, IndexedDB, cookies, and service workers.
 *
 * Lively mode: syncs via livelyPropertyListener + in-memory cache.
 * Browser mode: in-memory only with import/export helpers.
 */

const DEFAULT_STATE = {
  accentColor: '#8B5CF6',
  backgroundMode: 'aurora',
  glassOpacity: 0.72,
  blurAmount: 20,
  widgetScale: 1,
  animationSpeed: 1,
  focusMode: false,
  weatherUnits: 'celsius',
  timeFormat24: false,
  fontFamily: 'system',
  ambientSound: 'none',
  ambientVolume: 0.3,
  // Only the essential widgets are shown by default; the rest can be
  // enabled from the Settings → Widgets panel.
  hiddenWidgets: [
    'stopwatch',
    'countdown',
    'notes',
    'spotify',
    'github',
    'system',
    'worldclock',
    'events',
    'radar',
    'rss',
    'motivation',
  ],
  widgetPositions: {},
  todos: [],
  notes: [],
  countdowns: [],
  events: [],
  worldClocks: ['America/New_York', 'Europe/London', 'Asia/Tokyo'],
  githubUsername: '',
  weatherCoords: null,
  pomodoroWork: 25,
  pomodoroBreak: 5,
};

/** Deep-clone default state without relying on structuredClone (older WebView hosts). */
function cloneState(obj) {
  if (typeof structuredClone === 'function') return structuredClone(obj);
  return JSON.parse(JSON.stringify(obj));
}

/** @type {Map<string, unknown>} */
const memoryStore = new Map(Object.entries(cloneState(DEFAULT_STATE)));

/** @type {Set<(key: string, value: unknown) => void>} */
const listeners = new Set();

let livelyReady = false;
let persistDebounce = null;

/**
 * Detect Lively Wallpaper host environment.
 * @returns {boolean}
 */
let livelyDetected = false;

export function isLivelyEnvironment() {
  if (livelyDetected) return true;
  const ua = navigator.userAgent;
  return (
    ua.includes('WebView') ||
    ua.includes('Lively') ||
    /lively/i.test(location.href) ||
    /lively/i.test(document.referrer)
  );
}

export function markLivelyDetected() {
  livelyDetected = true;
}

/**
 * @returns {boolean}
 */
export function isPersistenceAvailable() {
  return isLivelyEnvironment() || true;
}

/**
 * @param {string} key
 * @param {unknown} [fallback]
 * @returns {unknown}
 */
export function get(key, fallback) {
  if (memoryStore.has(key)) return memoryStore.get(key);
  return fallback !== undefined ? fallback : DEFAULT_STATE[key];
}

/**
 * @param {string} key
 * @param {unknown} value
 */
export function set(key, value) {
  memoryStore.set(key, value);
  listeners.forEach((fn) => {
    try {
      fn(key, value);
    } catch {
      /* listener errors must not break persistence */
    }
  });
  scheduleLivelySync();
}

/**
 * @param {(key: string, value: unknown) => void} fn
 * @returns {() => void}
 */
export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * @returns {Record<string, unknown>}
 */
export function getAll() {
  return Object.fromEntries(memoryStore);
}

/**
 * @param {Record<string, unknown>} data
 */
export function mergeAll(data) {
  if (!data || typeof data !== 'object') return;
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined) memoryStore.set(key, value);
  });
  listeners.forEach((fn) => {
    try {
      fn('*', getAll());
    } catch {
      /* noop */
    }
  });
}

/**
 * Export full state as JSON string.
 * @returns {string}
 */
export function exportJSON() {
  return JSON.stringify(getAll(), null, 2);
}

/**
 * Import state from JSON string.
 * @param {string} json
 * @returns {boolean}
 */
export function importJSON(json) {
  try {
    const data = JSON.parse(json);
    mergeAll(data);
    scheduleLivelySync();
    return true;
  } catch {
    return false;
  }
}

/**
 * Download state as a file (works in browser preview).
 * @param {string} [filename]
 */
export function downloadExport(filename = 'aurora-desk-state.json') {
  const blob = new Blob([exportJSON()], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function scheduleLivelySync() {
  if (!livelyReady) return;
  clearTimeout(persistDebounce);
  persistDebounce = setTimeout(() => {
    if (typeof window.__livelyStateSync === 'function') {
      window.__livelyStateSync(exportJSON());
    }
  }, 500);
}

const LIVELY_KEY_MAP = {
  accentColor: 'accentColor',
  backgroundMode: 'backgroundMode',
  glassOpacity: 'glassOpacity',
  blurAmount: 'blurAmount',
  animationSpeed: 'animationSpeed',
  focusMode: 'focusMode',
  githubUsername: 'githubUsername',
  weatherUnits: 'weatherUnits',
  timeFormat24: 'timeFormat24',
  savedState: 'savedState',
};

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

/**
 * Wire Lively Wallpaper property listener bridge.
 * Call once at startup.
 */
export function initLivelyBridge() {
  if (!isLivelyEnvironment()) return;

  const previousListener = window.livelyPropertyListener;

  window.livelyPropertyListener = function livelyPropertyListener(name, val) {
    livelyReady = true;
    markLivelyDetected();
    applyLivelyProperty(name, val);
    if (typeof previousListener === 'function') {
      previousListener(name, val);
    }
  };

  window.__livelyStateSync = function livelyStateSync(json) {
    /* One-way: Lively reads savedState on next customize save by user.
       We keep memory authoritative during the session. */
    memoryStore.set('savedState', json);
  };
}

/**
 * @param {string} name
 * @param {unknown} val
 */
function applyLivelyProperty(name, val) {
  switch (name) {
    case 'accentColor':
      set('accentColor', val);
      break;
    case 'backgroundMode':
      set('backgroundMode', BG_MODES[Number(val)] ?? 'aurora');
      break;
    case 'glassOpacity':
      set('glassOpacity', Number(val) / 100);
      break;
    case 'blurAmount':
      set('blurAmount', Number(val));
      break;
    case 'animationSpeed':
      set('animationSpeed', Number(val) / 100);
      break;
    case 'focusMode':
      set('focusMode', Boolean(val));
      break;
    case 'githubUsername':
      set('githubUsername', String(val || ''));
      break;
    case 'weatherUnits':
      set('weatherUnits', Number(val) === 1 ? 'fahrenheit' : 'celsius');
      break;
    case 'timeFormat24':
      set('timeFormat24', Boolean(val));
      break;
    case 'savedState':
      if (val && typeof val === 'string' && val.trim().startsWith('{')) {
        importJSON(val);
      }
      break;
    default:
      break;
  }
}

export default {
  isLivelyEnvironment,
  isPersistenceAvailable,
  get,
  set,
  subscribe,
  getAll,
  mergeAll,
  exportJSON,
  importJSON,
  downloadExport,
  initLivelyBridge,
};
