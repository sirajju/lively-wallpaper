import * as persistence from '../persistence.js';

let lastFetch = 0;

export function initGitHub() {
  const el = document.getElementById('github-widget');
  if (!el) return;

  const userInput = el.querySelector('.gh-username');
  const loadBtn = el.querySelector('.gh-load');
  const graphEl = el.querySelector('.gh-graph');
  const reposEl = el.querySelector('.gh-repos');
  const streakEl = el.querySelector('.gh-streak');
  const statusEl = el.querySelector('.gh-status');

  const saved = String(persistence.get('githubUsername', ''));
  if (userInput && saved) userInput.value = saved;

  async function load(username) {
    if (!username) {
      if (statusEl) statusEl.textContent = 'Enter a GitHub username';
      return;
    }

    persistence.set('githubUsername', username);
    if (statusEl) statusEl.textContent = 'Loading…';

    if (graphEl) {
      graphEl.innerHTML = `<img src="https://ghchart.rshah.org/${encodeURIComponent(username)}" alt="Contributions" loading="lazy">`;
    }

    try {
      const now = Date.now();
      if (now - lastFetch < 60000) {
        if (statusEl) statusEl.textContent = 'Rate limit — showing cached graph';
        return;
      }
      lastFetch = now;

      const [userRes, reposRes] = await Promise.all([
        fetch(`https://api.github.com/users/${encodeURIComponent(username)}`),
        fetch(`https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=5`),
      ]);

      if (userRes.status === 403 || reposRes.status === 403) {
        if (statusEl) statusEl.textContent = 'Rate limited — try later';
        return;
      }

      if (!userRes.ok) throw new Error('User not found');
      const user = await userRes.json();
      const repos = reposRes.ok ? await reposRes.json() : [];

      if (streakEl) {
        streakEl.textContent = `Public repos: ${user.public_repos} · Followers: ${user.followers}`;
      }

      if (reposEl) {
        reposEl.innerHTML = repos
          .map(
            (r) =>
              `<a class="gh-repo" href="${r.html_url}" target="_blank" rel="noopener">★ ${r.stargazers_count} ${esc(r.name)}</a>`
          )
          .join('');
      }

      if (statusEl) statusEl.textContent = `@${user.login}`;
    } catch {
      if (statusEl) statusEl.textContent = 'Could not load profile';
      if (reposEl) reposEl.innerHTML = '';
    }
  }

  loadBtn?.addEventListener('click', () => load(userInput?.value.trim()));
  userInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') load(userInput.value.trim());
  });

  persistence.subscribe((key, val) => {
    if (key === 'githubUsername' && val) {
      if (userInput) userInput.value = String(val);
      load(String(val));
    }
  });

  if (saved) load(saved);
}

function esc(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}
