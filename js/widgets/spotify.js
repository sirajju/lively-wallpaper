/**
 * Spotify / now-playing widget.
 * Uses Lively --system-nowplaying when available, else placeholder.
 */

export function initSpotify() {
  const el = document.getElementById('spotify-widget');
  if (!el) return;

  const titleEl = el.querySelector('.spotify-title');
  const artistEl = el.querySelector('.spotify-artist');
  const albumEl = el.querySelector('.spotify-album');
  const artEl = el.querySelector('.spotify-art');
  const statusEl = el.querySelector('.spotify-status');

  function showPlaceholder() {
    if (titleEl) titleEl.textContent = 'Not Playing';
    if (artistEl) artistEl.textContent = 'Connect Spotify or any media player';
    if (albumEl) albumEl.textContent = '';
    if (artEl) artEl.innerHTML = '<div class="spotify-placeholder-icon">♫</div>';
    if (statusEl) statusEl.textContent = 'Lively now-playing API';
  }

  const prevTrack = window.livelyCurrentTrack;
  window.livelyCurrentTrack = function livelyCurrentTrack(data) {
    try {
      const obj = data ? JSON.parse(data) : null;
      if (!obj) {
        showPlaceholder();
        return;
      }
      if (titleEl) titleEl.textContent = obj.Title || 'Unknown';
      if (artistEl) artistEl.textContent = obj.Artist || obj.AlbumArtist || '';
      if (albumEl) albumEl.textContent = obj.AlbumTitle || '';
      if (obj.Thumbnail && artEl) {
        artEl.innerHTML = `<img src="data:image/png;base64,${obj.Thumbnail}" alt="Album art">`;
      }
      if (statusEl) statusEl.textContent = 'Now playing';
    } catch {
      showPlaceholder();
    }
    if (typeof prevTrack === 'function') prevTrack(data);
  };

  showPlaceholder();
}
