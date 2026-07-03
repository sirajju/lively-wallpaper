import * as persistence from '../persistence.js';

let items = [];
let index = 0;

/** @typedef {{ name: string, url: string }} RssFeed */

function getFeeds() {
  const feeds = persistence.get('rssFeeds', []);
  return Array.isArray(feeds) ? feeds.filter((f) => f && f.url) : [];
}

export function initRSS() {
  const el = document.getElementById('rss-widget');
  if (!el) return;

  const titleEl = el.querySelector('.rss-title');
  const sourceEl = el.querySelector('.rss-source');
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

  async function loadAll() {
    const feeds = getFeeds();
    if (!feeds.length) {
      if (statusEl) statusEl.textContent = 'No feeds configured';
      if (titleEl) titleEl.textContent = 'Add RSS feeds in Settings';
      items = [];
      return;
    }

    if (statusEl) statusEl.textContent = 'Loading feeds…';
    const results = await Promise.all(feeds.map(fetchFeed));
    items = results.flat();
    if (!items.length) {
      if (statusEl) statusEl.textContent = 'Feeds unavailable offline';
      if (titleEl) titleEl.textContent = 'Connect to load news';
      return;
    }
    index = 0;
    if (statusEl) statusEl.textContent = `${items.length} articles`;
    show();
  }

  function show() {
    if (!items.length) return;
    const item = items[index];
    if (titleEl) {
      titleEl.style.opacity = '0';
      setTimeout(() => {
        titleEl.textContent = item.title;
        titleEl.style.opacity = '1';
      }, 300);
    }
    if (sourceEl) sourceEl.textContent = item.source;
    if (titleEl) {
      titleEl.onclick = () => window.open(item.link, '_blank', 'noopener');
    }
  }

  persistence.subscribe((key) => {
    if (key === 'rssFeeds' || key === '*') loadAll();
  });

  loadAll();
  setInterval(() => {
    if (!items.length) return;
    index = (index + 1) % items.length;
    show();
  }, 12000);
  setInterval(loadAll, 30 * 60 * 1000);
}
