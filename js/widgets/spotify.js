/**
 * Now Playing widget.
 *
 * Two independent sources, either of which works on its own:
 *   1. Lively `--system-nowplaying` — reflects the Windows media session,
 *      so the Spotify desktop app (or any player/browser) shows up
 *      automatically with no login. This is the primary source in Lively.
 *   2. Spotify Web API — optional. Full OAuth (redirect + refresh) is not
 *      viable inside Lively's sandboxed WebView, so we let the user paste
 *      an access token to link their account. Tokens expire (~1h); we fail
 *      gracefully and prompt to reconnect.
 */

import * as persistence from '../persistence.js';

const POLL_MS = 15000;
let pollTimer = null;

export function initSpotify() {
  const el = document.getElementById('spotify-widget');
  if (!el) return;

  const titleEl = el.querySelector('.spotify-title');
  const artistEl = el.querySelector('.spotify-artist');
  const albumEl = el.querySelector('.spotify-album');
  const artEl = el.querySelector('.spotify-art');
  const eqEl = el.querySelector('.spotify-eq');
  const statusEl = el.querySelector('.spotify-status');
  const tokenInput = el.querySelector('.spotify-token');
  const connectBtn = el.querySelector('.spotify-connect-btn');
  const disconnectBtn = el.querySelector('.spotify-disconnect-btn');

  function setPlaying(playing) {
    el.classList.toggle('is-playing', Boolean(playing));
  }

  function showPlaceholder(message) {
    setPlaying(false);
    if (titleEl) titleEl.textContent = 'Not Playing';
    if (artistEl) artistEl.textContent = message || 'Start playback to see it here';
    if (albumEl) albumEl.textContent = '';
    if (artEl && eqEl) artEl.replaceChildren(eqEl);
    if (statusEl) statusEl.textContent = 'Idle';
  }

  function render({ title, artist, album, artUrl, artData }) {
    setPlaying(true);
    if (titleEl) titleEl.textContent = title || 'Unknown';
    if (artistEl) artistEl.textContent = artist || '';
    if (albumEl) albumEl.textContent = album || '';
    if (artEl) {
      const src = artData ? `data:image/png;base64,${artData}` : artUrl;
      if (src) {
        const img = document.createElement('img');
        img.src = src;
        img.alt = 'Album art';
        artEl.replaceChildren(img);
      } else if (eqEl) {
        artEl.replaceChildren(eqEl);
      }
    }
    if (statusEl) statusEl.textContent = 'Now playing';
  }

  /* --- Source 1: Lively system now-playing --- */
  const prevTrack = window.livelyCurrentTrack;
  window.livelyCurrentTrack = function livelyCurrentTrack(data) {
    try {
      const obj = data ? JSON.parse(data) : null;
      if (!obj) {
        showPlaceholder();
      } else {
        render({
          title: obj.Title,
          artist: obj.Artist || obj.AlbumArtist,
          album: obj.AlbumTitle,
          artData: obj.Thumbnail || null,
        });
      }
    } catch {
      showPlaceholder();
    }
    if (typeof prevTrack === 'function') prevTrack(data);
  };

  /* --- Source 2: Spotify Web API (optional token) --- */
  async function pollSpotify() {
    const token = String(persistence.get('spotifyToken', ''));
    if (!token) return;
    try {
      const res = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 204) {
        showPlaceholder('Nothing playing on Spotify right now');
        return;
      }
      if (res.status === 401) {
        if (statusEl) statusEl.textContent = 'Token expired — reconnect';
        showPlaceholder('Spotify token expired. Paste a fresh token.');
        return;
      }
      if (res.status === 429) {
        if (statusEl) statusEl.textContent = 'Rate limited';
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      const item = data.item;
      if (!item) {
        showPlaceholder('Nothing playing on Spotify right now');
        return;
      }
      render({
        title: item.name,
        artist: (item.artists || []).map((a) => a.name).join(', '),
        album: item.album?.name,
        artUrl: item.album?.images?.[0]?.url,
      });
    } catch {
      if (statusEl) statusEl.textContent = 'Spotify unavailable';
    }
  }

  function startPolling() {
    stopPolling();
    if (!persistence.get('spotifyToken', '')) return;
    pollSpotify();
    pollTimer = setInterval(pollSpotify, POLL_MS);
  }

  function stopPolling() {
    clearInterval(pollTimer);
    pollTimer = null;
  }

  function reflectConnection() {
    const connected = Boolean(persistence.get('spotifyToken', ''));
    if (disconnectBtn) disconnectBtn.hidden = !connected;
    if (connectBtn) connectBtn.textContent = connected ? 'Update' : 'Connect';
    if (tokenInput) tokenInput.value = '';
  }

  connectBtn?.addEventListener('click', () => {
    const token = tokenInput?.value.trim();
    if (!token) return;
    persistence.set('spotifyToken', token);
    reflectConnection();
    startPolling();
  });

  disconnectBtn?.addEventListener('click', () => {
    persistence.set('spotifyToken', '');
    stopPolling();
    reflectConnection();
    showPlaceholder();
  });

  persistence.subscribe((key) => {
    if (key === 'spotifyToken' || key === '*') {
      reflectConnection();
      startPolling();
    }
  });

  showPlaceholder();
  reflectConnection();
  startPolling();
}
