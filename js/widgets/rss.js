import * as persistence from '../persistence.js';

let items = [];
let index = 0;
let rotateTimer = null;

/** @typedef {{ name: string, url: string }} RssFeed */

function getFeeds() {
  const feeds = persistence.get('rssFeeds', []);
  return Array.isArray(feeds) ? feeds.filter((f) => f && f.url) : [];
}

function getMaxItems() {
  return Math.min(20, Math.max(1, Number(persistence.get('rssMaxItems', 5)) || 5));
}

function getMode() {
  return persistence.get('rssDisplayMode', 'list') === 'rotate' ? 'rotate' : 'list';
}

function getRotateMs() {
  return Math.min(120, Math.max(3, Number(persistence.get('rssRotateSeconds', 12)) || 12)) * 1000;
}

export function initRSS() {
  const el = document.getElementById('rss-widget');
  if (!el) return;

  const listEl = el.querySelector('.rss-list');
  const statusEl = el.querySelector('.rss-status');

  async function fetchFeed(/** @type {RssFeed} */ feed) {
    try {
      const api = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed.url)}`;
      const res = await fetch(api);
      if (!res.ok) return [];
      const data = await res.json();
      return (data.items || []).slice(0, 10).map((item) => ({
        title: item.title,
        link: item.link,
        source: feed.name || 'Feed',
      }));
    } catch {
      return [];
    }
  }

  function clearRotate() {
    if (rotateTimer) {
      clearInterval(rotateTimer);
      rotateTimer = null;
    }
  }

  function renderList(slice) {
    if (!listEl) return;
    listEl.innerHTML = slice
      .map(
        (item) => `
        <li class="rss-item">
          <a class="rss-item-link" href="${encodeURI(item.link)}" target="_blank" rel="noopener">
            <span class="rss-item-source">${escapeHtml(item.source)}</span>
            <span class="rss-item-title">${escapeHtml(item.title)}</span>
          </a>
        </li>`
      )
      .join('');
  }

  function renderRotate(slice) {
    if (!listEl || !slice.length) return;
    const item = slice[index % slice.length];
    listEl.innerHTML = `
      <li class="rss-item rss-item-rotate">
        <a class="rss-item-link" href="${encodeURI(item.link)}" target="_blank" rel="noopener">
          <span class="rss-item-source">${escapeHtml(item.source)}</span>
          <span class="rss-item-title">${escapeHtml(item.title)}</span>
        </a>
      </li>`;
  }

  function render() {
    const slice = items.slice(0, getMaxItems());
    if (!slice.length) return;

    clearRotate();
    if (getMode() === 'list') {
      renderList(slice);
    } else {
      index = 0;
      renderRotate(slice);
      rotateTimer = setInterval(() => {
        index = (index + 1) % slice.length;
        renderRotate(slice);
      }, getRotateMs());
    }
  }

  async function loadAll() {
    const feeds = getFeeds();
    if (!feeds.length) {
      if (statusEl) statusEl.textContent = 'No feeds configured';
      if (listEl) {
        listEl.innerHTML = '<li class="settings-hint">Add RSS feeds in Settings → Widgets → RSS</li>';
      }
      items = [];
      clearRotate();
      return;
    }

    if (statusEl) statusEl.textContent = 'Loading feeds…';
    const results = await Promise.all(feeds.map(fetchFeed));
    items = results.flat();
    if (!items.length) {
      if (statusEl) statusEl.textContent = 'Feeds unavailable offline';
      if (listEl) listEl.innerHTML = '<li class="settings-hint">Connect to load news</li>';
      clearRotate();
      return;
    }

    if (statusEl) statusEl.textContent = `${items.length} articles`;
    render();
  }

  persistence.subscribe((key) => {
    if (
      key === 'rssFeeds' ||
      key === 'rssDisplayMode' ||
      key === 'rssMaxItems' ||
      key === 'rssRotateSeconds' ||
      key === '*'
    ) {
      if (items.length) render();
      else loadAll();
    }
  });

  loadAll();
  setInterval(loadAll, 30 * 60 * 1000);
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}
