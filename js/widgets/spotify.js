/**
 * Now Playing widget.
 *
 * Source: Lively `--system-nowplaying`, which reflects the Windows media
 * session. The Spotify desktop app (or any player/browser) shows up
 * automatically with album art and no login required. Outside Lively
 * (e.g. browser preview) the widget shows an idle placeholder.
 */

export function initSpotify() {
  const el = document.getElementById('spotify-widget');
  if (!el) return;

  const titleEl = el.querySelector('.spotify-title');
  const artistEl = el.querySelector('.spotify-artist');
  const albumEl = el.querySelector('.spotify-album');
  const artEl = el.querySelector('.spotify-art');
  const eqEl = el.querySelector('.spotify-eq');
  const statusEl = el.querySelector('.spotify-status');

  function setPlaying(playing) {
    el.classList.toggle('is-playing', Boolean(playing));
  }

  function showPlaceholder() {
    setPlaying(false);
    if (titleEl) titleEl.textContent = 'Not Playing';
    if (artistEl) artistEl.textContent = 'Start playback to see it here';
    if (albumEl) albumEl.textContent = '';
    if (artEl && eqEl) artEl.replaceChildren(eqEl);
    if (statusEl) statusEl.textContent = 'Idle';
  }

  function render({ title, artist, album, artData }) {
    setPlaying(true);
    if (titleEl) titleEl.textContent = title || 'Unknown';
    if (artistEl) artistEl.textContent = artist || '';
    if (albumEl) albumEl.textContent = album || '';
    if (artEl) {
      if (artData) {
        const img = document.createElement('img');
        img.src = `data:image/png;base64,${artData}`;
        img.alt = 'Album art';
        artEl.replaceChildren(img);
      } else if (eqEl) {
        artEl.replaceChildren(eqEl);
      }
    }
    if (statusEl) statusEl.textContent = 'Now playing';
  }

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

  showPlaceholder();
}
