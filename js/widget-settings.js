/**
 * Per-widget configuration panels rendered inside Settings → Widgets.
 */

import * as persistence from './persistence.js';
import { CITY_LABELS } from './widgets/world-clock.js';

/** @typedef {(container: HTMLElement) => void} SettingsRenderer */

/** @type {Record<string, SettingsRenderer>} */
const RENDERERS = {
  pomodoro: renderPomodoro,
  github: renderGitHub,
  worldclock: renderWorldClock,
  rss: renderRss,
  weather: renderWeather,
  countdown: renderCountdown,
  events: renderEvents,
  todo: renderTodo,
  notes: renderNotes,
  spotify: renderSpotify,
  clock: renderClock,
};

/** Persistence keys that should refresh widget setting panels. */
export const WIDGET_SETTING_KEYS = new Set([
  'rssFeeds',
  'rssDisplayMode',
  'rssMaxItems',
  'rssRotateSeconds',
  'githubUsername',
  'pomodoroWork',
  'pomodoroBreak',
  'worldClocks',
  'weatherUnits',
  'weatherCoords',
  'countdowns',
  'events',
  'todos',
  'notes',
]);

/**
 * @param {string} id
 * @returns {boolean}
 */
export function hasWidgetSettings(id) {
  return id in RENDERERS;
}

/**
 * @param {string} id
 * @param {HTMLElement} container
 */
export function renderWidgetSettings(id, container) {
  container.innerHTML = '';
  const fn = RENDERERS[id];
  if (fn) fn(container);
}

function field(label, input) {
  const wrap = document.createElement('label');
  wrap.className = 'widget-setting-field';
  wrap.innerHTML = `<span>${label}</span>`;
  wrap.appendChild(input);
  return wrap;
}

function hint(text) {
  const p = document.createElement('p');
  p.className = 'settings-hint widget-setting-hint';
  p.textContent = text;
  return p;
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function renderPomodoro(container) {
  const work = document.createElement('input');
  work.type = 'number';
  work.min = '1';
  work.max = '90';
  work.value = String(persistence.get('pomodoroWork', 25));
  work.addEventListener('change', () => {
    persistence.set('pomodoroWork', Math.max(1, Number(work.value) || 25));
  });

  const brk = document.createElement('input');
  brk.type = 'number';
  brk.min = '1';
  brk.max = '30';
  brk.value = String(persistence.get('pomodoroBreak', 5));
  brk.addEventListener('change', () => {
    persistence.set('pomodoroBreak', Math.max(1, Number(brk.value) || 5));
  });

  container.append(field('Work (minutes)', work), field('Break (minutes)', brk));
}

function renderGitHub(container) {
  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'username';
  input.value = String(persistence.get('githubUsername', ''));
  input.addEventListener('change', () => {
    persistence.set('githubUsername', input.value.trim());
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') persistence.set('githubUsername', input.value.trim());
  });
  container.append(field('Username', input), hint('Profile loads automatically when saved.'));
}

function renderWorldClock(container) {
  const list = document.createElement('ul');
  list.className = 'widget-setting-list';

  function paint() {
    const zones = /** @type {string[]} */ (persistence.get('worldClocks', []));
    list.innerHTML = zones
      .map(
        (tz) => `
        <li class="widget-setting-list-item">
          <span>${escapeHtml(CITY_LABELS[tz] || tz)}</span>
          <button class="icon-btn" data-tz="${escapeHtml(tz)}" aria-label="Remove" title="Remove">×</button>
        </li>`
      )
      .join('');

    list.querySelectorAll('button[data-tz]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const tz = btn.getAttribute('data-tz');
        const current = /** @type {string[]} */ (persistence.get('worldClocks', []));
        persistence.set('worldClocks', current.filter((z) => z !== tz));
        paint();
      });
    });
  }

  const row = document.createElement('div');
  row.className = 'widget-setting-inline';
  const select = document.createElement('select');
  Object.entries(CITY_LABELS).forEach(([tz, label]) => {
    const opt = document.createElement('option');
    opt.value = tz;
    opt.textContent = label;
    select.appendChild(opt);
  });
  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'btn-icon btn-primary';
  addBtn.setAttribute('aria-label', 'Add city');
  addBtn.title = 'Add city';
  addBtn.textContent = '+';
  addBtn.addEventListener('click', () => {
    const tz = select.value;
    const zones = /** @type {string[]} */ (persistence.get('worldClocks', []));
    if (!zones.includes(tz)) persistence.set('worldClocks', [...zones, tz]);
    paint();
  });
  row.append(select, addBtn);

  paint();
  container.append(list, row);
}

function renderRss(container) {
  const mode = document.createElement('select');
  [
    ['list', 'List (show multiple)'],
    ['rotate', 'Rotate (one at a time)'],
  ].forEach(([value, label]) => {
    const opt = document.createElement('option');
    opt.value = value;
    opt.textContent = label;
    if (value === persistence.get('rssDisplayMode', 'list')) opt.selected = true;
    mode.appendChild(opt);
  });
  mode.addEventListener('change', () => persistence.set('rssDisplayMode', mode.value));

  const maxItems = document.createElement('input');
  maxItems.type = 'number';
  maxItems.min = '1';
  maxItems.max = '20';
  maxItems.value = String(persistence.get('rssMaxItems', 5));
  maxItems.addEventListener('change', () => {
    persistence.set('rssMaxItems', Math.min(20, Math.max(1, Number(maxItems.value) || 5)));
  });

  const rotateSec = document.createElement('input');
  rotateSec.type = 'number';
  rotateSec.min = '3';
  rotateSec.max = '120';
  rotateSec.value = String(persistence.get('rssRotateSeconds', 12));
  rotateSec.addEventListener('change', () => {
    persistence.set('rssRotateSeconds', Math.min(120, Math.max(3, Number(rotateSec.value) || 12)));
  });

  container.append(
    field('Display', mode),
    field('Max headlines', maxItems),
    field('Rotate every (seconds)', rotateSec),
    hint('Add feeds below. List mode shows several headlines at once.')
  );

  const form = document.createElement('div');
  form.className = 'rss-settings-form';
  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.placeholder = 'Name';
  nameInput.setAttribute('aria-label', 'Feed name');
  const urlInput = document.createElement('input');
  urlInput.type = 'url';
  urlInput.placeholder = 'https://…/feed';
  urlInput.setAttribute('aria-label', 'Feed URL');
  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'btn-icon btn-primary';
  addBtn.setAttribute('aria-label', 'Add feed');
  addBtn.title = 'Add feed';
  addBtn.textContent = '+';

  const feedList = document.createElement('ul');
  feedList.className = 'rss-feed-list';

  function paintFeeds() {
    const feeds = /** @type {{ name: string, url: string }[]} */ (persistence.get('rssFeeds', []));
    feedList.innerHTML = '';
    if (!feeds.length) {
      feedList.innerHTML = '<li class="settings-hint">No feeds yet.</li>';
      return;
    }
    feeds.forEach((feed, i) => {
      const li = document.createElement('li');
      li.className = 'rss-feed-item';
      li.innerHTML = `
        <span class="rss-feed-item-name">${escapeHtml(feed.name || 'Unnamed')}</span>
        <span class="rss-feed-item-url">${escapeHtml(feed.url)}</span>
        <button class="icon-btn rss-feed-remove" data-index="${i}" aria-label="Remove" title="Remove">×</button>
      `;
      feedList.appendChild(li);
    });
    feedList.querySelectorAll('.rss-feed-remove').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.getAttribute('data-index'));
        const current = [...(persistence.get('rssFeeds', []) || [])];
        current.splice(idx, 1);
        persistence.set('rssFeeds', current);
        paintFeeds();
      });
    });
  }

  function addFeed() {
    const name = nameInput.value.trim();
    const url = urlInput.value.trim();
    if (!url) return;
    try {
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) return;
      const feeds = [...(persistence.get('rssFeeds', []) || [])];
      if (feeds.some((f) => f.url === url)) return;
      feeds.push({ name: name || parsed.hostname, url });
      persistence.set('rssFeeds', feeds);
      nameInput.value = '';
      urlInput.value = '';
      paintFeeds();
    } catch {
      /* invalid url */
    }
  }

  addBtn.addEventListener('click', addFeed);
  urlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addFeed();
  });
  form.append(nameInput, urlInput, addBtn);

  paintFeeds();
  container.append(form, feedList);
}

function renderWeather(container) {
  const coords = /** @type {{ label?: string } | null} */ (persistence.get('weatherCoords', null));
  const label = coords?.label || 'Mumbai';
  container.append(
    hint(`Location: ${label} (fixed — no permission prompt).`),
    hint('Temperature units are under Preferences → Temperature.')
  );
}

function renderCountdown(container) {
  const list = document.createElement('ul');
  list.className = 'widget-setting-list';

  function paint() {
    const items = /** @type {{ id: string, label: string, target: string }[]} */ (
      persistence.get('countdowns', [])
    );
    list.innerHTML = items.length
      ? items
          .map(
            (cd) => `
          <li class="widget-setting-list-item">
            <span>${escapeHtml(cd.label)} · ${escapeHtml(new Date(cd.target).toLocaleString())}</span>
            <button class="icon-btn" data-id="${escapeHtml(cd.id)}" aria-label="Remove" title="Remove">×</button>
          </li>`
          )
          .join('')
      : '<li class="settings-hint">No countdowns yet. Add from the widget.</li>';

    list.querySelectorAll('button[data-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const current = /** @type {typeof items} */ (persistence.get('countdowns', []));
        persistence.set('countdowns', current.filter((c) => c.id !== id));
        paint();
      });
    });
  }

  paint();
  container.append(list, hint('Add new countdowns from the Countdown widget.'));
}

function renderEvents(container) {
  const list = document.createElement('ul');
  list.className = 'widget-setting-list';

  function paint() {
    const items = /** @type {{ id: string, title: string, date: string, time?: string }[]} */ (
      persistence.get('events', [])
    );
    list.innerHTML = items.length
      ? items
          .map(
            (ev) => `
          <li class="widget-setting-list-item">
            <span>${escapeHtml(ev.title)} · ${escapeHtml(ev.date)}${ev.time ? ` ${ev.time}` : ''}</span>
            <button class="icon-btn" data-id="${escapeHtml(ev.id)}" aria-label="Remove" title="Remove">×</button>
          </li>`
          )
          .join('')
      : '<li class="settings-hint">No events yet. Add from the Agenda widget.</li>';

    list.querySelectorAll('button[data-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const current = /** @type {typeof items} */ (persistence.get('events', []));
        persistence.set('events', current.filter((e) => e.id !== id));
        paint();
      });
    });
  }

  paint();
  container.append(list, hint('Add new events from the Agenda widget.'));
}

function renderTodo(container) {
  const todos = /** @type {unknown[]} */ (persistence.get('todos', []));
  container.append(
    hint(`${todos.length} task(s) saved.`),
    hint('Add, complete, and edit tasks on the Tasks widget.')
  );
}

function renderNotes(container) {
  const notes = /** @type {unknown[]} */ (persistence.get('notes', []));
  container.append(
    hint(`${notes.length} note(s) saved.`),
    hint('Create and edit notes on the Notes widget.')
  );
}

function renderSpotify(container) {
  container.append(hint('Playback is detected automatically from Spotify or your system media player in Lively.'));
}

function renderClock(container) {
  container.append(hint('24-hour time is configured under Preferences.'));
}
