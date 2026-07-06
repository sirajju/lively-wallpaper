/**
 * Persistence abstraction for Aurora Desk.
 *
 * Storage layers (in order of preference):
 *   1. localStorage — survives reloads in browsers and Lively's WebView2.
 *   2. In-memory Map — always present; used as the live cache and as a
 *      fallback when localStorage is unavailable (e.g. disabled/sandboxed).
 *   3. Lively savedState property — for portable export/import across machines.
 *
 * All three are kept in sync so a reload restores the last state automatically.
 */

const STORAGE_KEY = 'auroraDeskState';

const DEFAULT_STATE = {
  accentColor: '#8B5CF6',
  backgroundMode: 'aurora',
  glassOpacity: 0.34,
  blurAmount: 24,
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
  // Clean, non-overlapping default layout on the 12×8 grid:
  //   Row band 0–1: Clock · Greeting · Weather  (each 4 wide × 2 tall)
  //   Row band 2–5: Calendar · Pomodoro · Todo  (each 4 wide × 4 tall)
  widgetDocks: {
    clock: { col: 0, row: 0 },
    greeting: { col: 4, row: 0 },
    weather: { col: 8, row: 0 },
    calendar: { col: 0, row: 2 },
    pomodoro: { col: 4, row: 2 },
    todo: { col: 8, row: 2 },
  },
  widgetSpans: {
    clock: { cols: 4, rows: 2 },
    greeting: { cols: 4, rows: 2 },
    weather: { cols: 4, rows: 2 },
    calendar: { cols: 4, rows: 4 },
    pomodoro: { cols: 4, rows: 4 },
    todo: { cols: 4, rows: 4 },
  },
  todos: [],
  notes: [],
  countdowns: [],
  events: [],
  worldClocks: ['Asia/Kolkata', 'Europe/London', 'America/New_York'],
  githubUsername: '',
  weatherCoords: null,
  rssFeeds: [
    { name: 'Hacker News', url: 'https://hnrss.org/frontpage' },
    { name: 'Dev.to', url: 'https://dev.to/feed' },
    { name: 'CSS-Tricks', url: 'https://css-tricks.com/feed/' },
  ],
  rssDisplayMode: 'list',
  rssMaxItems: 5,
  rssRotateSeconds: 12,
  pomodoroWork: 25,
  pomodoroBreak: 5,
};

/** Keys written by export metadata — not restored on import. */
const EXPORT_META_KEYS = new Set(['exportVersion', 'exportedAt', 'app']);

/** Internal / duplicate keys excluded from portable export. */
const INTERNAL_KEYS = new Set(['savedState']);

/** @type {((json: string) => void) | null} */
let exportFallback = null;

/** @type {(() => Record<string, unknown>) | null} */
let snapshotProvider = null;

/**
 * Register UI fallback when clipboard copy fails (e.g. show manual copy dialog).
 * @param {(json: string) => void} fn
 */
export function setExportFallback(fn) {
  exportFallback = fn;
}

/**
 * Register a function that captures live DOM state before export.
 * Wired from script.js to avoid circular imports with widget-sizes.
 * @param {() => Record<string, unknown>} fn
 */
export function setSnapshotProvider(fn) {
  snapshotProvider = fn;
}

/** @type {boolean} Suppress listener side-effects during bulk import. */
let isImporting = false;

/**
 * @param {unknown} a
 * @param {unknown} b
 * @returns {boolean}
 */
function valuesEqual(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return a === b;
  if (typeof a !== typeof b) return false;
  if (typeof a === 'object') {
    try {
      return JSON.stringify(a) === JSON.stringify(b);
    } catch {
      return false;
    }
  }
  return false;
}

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
let storageDebounce = null;
let storageAvailable = false;

/** Get the localStorage object if it's usable, else null. */
function safeStorage() {
  try {
    const ls = window.localStorage;
    const probe = '__aurora_probe__';
    ls.setItem(probe, '1');
    ls.removeItem(probe);
    return ls;
  } catch {
    return null;
  }
}

/** Load persisted state from localStorage into the in-memory cache. */
function loadFromStorage() {
  const ls = safeStorage();
  storageAvailable = !!ls;
  if (!ls) return;
  try {
    const raw = ls.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (data && typeof data === 'object') {
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined) memoryStore.set(key, value);
      });
    }
  } catch {
    /* corrupt storage must not break startup */
  }
}

/** Persist the full state to localStorage (debounced). */
function scheduleStorageSave() {
  if (!storageAvailable) return;
  clearTimeout(storageDebounce);
  storageDebounce = setTimeout(() => {
    const ls = safeStorage();
    if (!ls) return;
    try {
      ls.setItem(STORAGE_KEY, exportJSON());
    } catch {
      /* quota or serialization errors are non-fatal */
    }
  }, 250);
}

// Restore immediately so widgets read persisted values on first init.
loadFromStorage();

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
  const prev = memoryStore.get(key);
  if (valuesEqual(prev, value)) return;

  memoryStore.set(key, value);
  if (isImporting) {
    scheduleStorageSave();
    return;
  }

  listeners.forEach((fn) => {
    try {
      fn(key, value);
    } catch {
      /* listener errors must not break persistence */
    }
  });
  scheduleStorageSave();
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
 * @param {{ notifyEachKey?: boolean }} [options]
 */
export function mergeAll(data, options = {}) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return;
  /** @type {string[]} */
  const keys = [];
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined) {
      memoryStore.set(key, value);
      keys.push(key);
    }
  });

  if (options.silent || isImporting) {
    scheduleStorageSave();
    return;
  }

  if (options.notifyEachKey) {
    keys.forEach((key) => {
      listeners.forEach((fn) => {
        try {
          fn(key, memoryStore.get(key));
        } catch {
          /* noop */
        }
      });
    });
  }
  listeners.forEach((fn) => {
    try {
      fn('*', getAll());
    } catch {
      /* noop */
    }
  });
  scheduleStorageSave();
}

/**
 * Build a complete portable state object: defaults + store + optional live DOM snapshot.
 * @param {{ captureLive?: boolean, syncLiveToMemory?: boolean }} [options]
 * @returns {Record<string, unknown>}
 */
export function buildExportState(options = {}) {
  const { captureLive = false, syncLiveToMemory = false } = options;
  const full = cloneState(DEFAULT_STATE);

  for (const [key, value] of memoryStore) {
    if (INTERNAL_KEYS.has(key)) continue;
    full[key] = cloneState(value);
  }

  if (captureLive && snapshotProvider) {
    const live = snapshotProvider();
    Object.assign(full, live);
    if (syncLiveToMemory) {
      Object.entries(live).forEach(([key, value]) => {
        if (!EXPORT_META_KEYS.has(key) && !INTERNAL_KEYS.has(key)) {
          memoryStore.set(key, cloneState(value));
        }
      });
    }
  }

  if (captureLive) {
    full.exportVersion = 1;
    full.exportedAt = new Date().toISOString();
    full.app = 'aurora-desk';
  }

  return full;
}

/**
 * Export full state as JSON string (memory only — does not overwrite from DOM).
 * @returns {string}
 */
export function exportJSON() {
  return JSON.stringify(buildExportState(), null, 2);
}

/**
 * Import state from JSON string.
 * @param {string} json
 * @returns {boolean}
 */
export function importJSON(json) {
  try {
    const data = JSON.parse(json);
    if (!data || typeof data !== 'object' || Array.isArray(data)) return false;

    const cleaned = { ...data };
    EXPORT_META_KEYS.forEach((key) => delete cleaned[key]);
    INTERNAL_KEYS.forEach((key) => delete cleaned[key]);

    isImporting = true;
    try {
      mergeAll(cleaned, { silent: true });
    } finally {
      isImporting = false;
    }

    listeners.forEach((fn) => {
      try {
        fn('*', getAll());
      } catch {
        /* noop */
      }
    });
    scheduleStorageSave();
    scheduleLivelySync();
    return true;
  } catch {
    isImporting = false;
    return false;
  }
}

/**
 * Full export JSON string (live DOM + memory).
 * @returns {string}
 */
export function getExportText() {
  try {
    return JSON.stringify(
      buildExportState({ captureLive: true, syncLiveToMemory: true }),
      null,
      2,
    );
  } catch {
    return exportJSON();
  }
}

/**
 * Copy text using Clipboard API with execCommand fallback (WebView-safe).
 * @param {string} text
 * @returns {Promise<boolean>}
 */
export async function copyTextToClipboard(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* try fallback */
  }

  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    ta.style.top = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, text.length);
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

/**
 * Try to trigger a file download (works in browser; often blocked in Lively).
 * @param {string} json
 * @param {string} filename
 * @returns {boolean}
 */
export function tryFileDownload(json, filename = 'aurora-desk-state.json') {
  try {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Export state — clipboard first (Lively), file download in browser preview.
 * @param {string} [filename]
 * @returns {Promise<{ json: string, copied: boolean, downloaded: boolean }>}
 */
export async function performExport(filename = 'aurora-desk-state.json') {
  const json = getExportText();

  if (typeof window.__livelyStateSync === 'function') {
    window.__livelyStateSync(json);
  }

  const copied = await copyTextToClipboard(json);
  const downloaded = !isLivelyEnvironment() && tryFileDownload(json, filename);

  if (!copied && exportFallback) {
    try {
      exportFallback(json);
    } catch {
      /* UI fallback must not break export */
    }
  }

  return { json, copied, downloaded };
}

/**
 * Download / copy state (Lively-safe).
 * @param {string} [filename]
 * @returns {Promise<{ json: string, copied: boolean, downloaded: boolean }>}
 */
export async function downloadExport(filename = 'aurora-desk-state.json') {
  return performExport(filename);
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
  setSnapshotProvider,
  setExportFallback,
  buildExportState,
  getExportText,
  copyTextToClipboard,
  tryFileDownload,
  performExport,
  exportJSON,
  importJSON,
  downloadExport,
  initLivelyBridge,
};
