/**
 * Mini weather radar using RainViewer tile API.
 */

let radarFrames = [];
let frameIndex = 0;
let animTimer = null;

export function initWeatherRadar() {
  const el = document.getElementById('radar-widget');
  if (!el) return;

  const mapEl = el.querySelector('.radar-map');
  const statusEl = el.querySelector('.radar-status');

  async function loadRadar() {
    try {
      const res = await fetch('https://api.rainviewer.com/public/weather-maps.json');
      if (!res.ok) throw new Error('Radar unavailable');
      const data = await res.json();
      radarFrames = data.radar?.past?.slice(-8) || [];
      if (!radarFrames.length) throw new Error('No frames');
      if (statusEl) statusEl.textContent = 'Live precipitation';
      animate(mapEl);
    } catch {
      if (statusEl) statusEl.textContent = 'Radar unavailable';
      if (mapEl) {
        mapEl.innerHTML = '<div class="radar-placeholder">🌧️</div>';
      }
    }
  }

  function animate(container) {
    if (!container || !radarFrames.length) return;
    clearInterval(animTimer);
    frameIndex = 0;

    const host = 'https://tilecache.rainviewer.com';
    const lat = 40.7;
    const lon = -74;
    const zoom = 4;

    function showFrame() {
      const frame = radarFrames[frameIndex];
      const path = frame?.path;
      if (!path) return;
      const url = `${host}${path}/256/${zoom}/${Math.floor((lon + 180) / 360 * Math.pow(2, zoom))}/${Math.floor((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2 * Math.pow(2, zoom))}/2/1_1.png`;
      container.style.backgroundImage = `url(${url})`;
      frameIndex = (frameIndex + 1) % radarFrames.length;
    }

    showFrame();
    animTimer = setInterval(showFrame, 800);
  }

  loadRadar();
  setInterval(loadRadar, 10 * 60 * 1000);
}
