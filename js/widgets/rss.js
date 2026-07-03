const FEEDS = [
  { name: 'Hacker News', url: 'https://hnrss.org/frontpage' },
  { name: 'Dev.to', url: 'https://dev.to/feed' },
  { name: 'CSS-Tricks', url: 'https://css-tricks.com/feed/' },
];

let items = [];
let index = 0;

export function initRSS() {
  const el = document.getElementById('rss-widget');
  if (!el) return;

  const titleEl = el.querySelector('.rss-title');
  const sourceEl = el.querySelector('.rss-source');
  const statusEl = el.querySelector('.rss-status');

  async function fetchFeed(feed) {
    try {
      const api = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed.url)}`;
      const res = await fetch(api);
      if (!res.ok) return [];
      const data = await res.json();
      return (data.items || []).slice(0, 10).map((item) => ({
        title: item.title,
        link: item.link,
        source: feed.name,
      }));
    } catch {
      return [];
    }
  }

  async function loadAll() {
    if (statusEl) statusEl.textContent = 'Loading feeds…';
    const results = await Promise.all(FEEDS.map(fetchFeed));
    items = results.flat();
    if (!items.length) {
      if (statusEl) statusEl.textContent = 'Feeds unavailable offline';
      if (titleEl) titleEl.textContent = 'Connect to load developer news';
      return;
    }
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

  loadAll();
  setInterval(() => {
    if (!items.length) return;
    index = (index + 1) % items.length;
    show();
  }, 12000);
  setInterval(loadAll, 30 * 60 * 1000);
}
