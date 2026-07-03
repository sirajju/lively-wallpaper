import { weatherIcon } from '../utils.js';
import * as persistence from '../persistence.js';

let coords = null;

export function initWeather() {
  const el = document.getElementById('weather-widget');
  if (!el) return;

  const tempEl = el.querySelector('.weather-temp');
  const iconEl = el.querySelector('.weather-icon');
  const humEl = el.querySelector('.weather-humidity');
  const windEl = el.querySelector('.weather-wind');
  const sunriseEl = el.querySelector('.weather-sunrise');
  const sunsetEl = el.querySelector('.weather-sunset');
  const locEl = el.querySelector('.weather-location');
  const statusEl = el.querySelector('.weather-status');

  async function fetchWeather(lat, lon, label) {
    try {
      const units = persistence.get('weatherUnits', 'celsius') === 'fahrenheit' ? 'fahrenheit' : 'celsius';
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&daily=sunrise,sunset&temperature_unit=${units}&wind_speed_unit=kmh&timezone=auto`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Weather fetch failed');
      const data = await res.json();
      const cur = data.current;
      const daily = data.daily;

      if (tempEl) tempEl.textContent = `${Math.round(cur.temperature_2m)}°${units === 'fahrenheit' ? 'F' : 'C'}`;
      if (iconEl) iconEl.textContent = weatherIcon(cur.weather_code);
      if (humEl) humEl.textContent = `${cur.relative_humidity_2m}%`;
      if (windEl) windEl.textContent = `${Math.round(cur.wind_speed_10m)} km/h`;
      if (sunriseEl) sunriseEl.textContent = formatSun(daily.sunrise[0]);
      if (sunsetEl) sunsetEl.textContent = formatSun(daily.sunset[0]);
      if (locEl) locEl.textContent = label;
      if (statusEl) statusEl.textContent = '';
    } catch {
      if (statusEl) statusEl.textContent = 'Weather unavailable';
    }
  }

  function formatSun(iso) {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  /**
   * Request the browser location exactly once. In Lively's WebView the
   * permission is not persisted, so repeated getCurrentPosition calls would
   * re-prompt the user — we avoid that by caching coordinates and never
   * asking again once we have them.
   */
  function locateOnce() {
    if (!navigator.geolocation) {
      coords = { lat: 40.71, lon: -74.01, label: 'New York (default)' };
      if (statusEl) statusEl.textContent = 'Location not supported';
      fetchWeather(coords.lat, coords.lon, coords.label);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        coords = { lat: pos.coords.latitude, lon: pos.coords.longitude, label: 'Your location' };
        persistence.set('weatherCoords', coords);
        fetchWeather(coords.lat, coords.lon, coords.label);
      },
      () => {
        // Fall back in-memory so we never re-prompt this session.
        coords = { lat: 51.51, lon: -0.13, label: 'London (default)' };
        if (statusEl) statusEl.textContent = 'Location denied — using default';
        fetchWeather(coords.lat, coords.lon, coords.label);
      },
      { timeout: 10000, maximumAge: Infinity }
    );
  }

  function refresh() {
    if (coords) fetchWeather(coords.lat, coords.lon, coords.label || 'Your location');
    else locateOnce();
  }

  persistence.subscribe((key) => {
    if ((key === 'weatherUnits' || key === '*') && coords) {
      fetchWeather(coords.lat, coords.lon, coords.label || 'Your location');
    }
  });

  // Reuse coordinates saved in a previous session — no prompt needed.
  const saved = persistence.get('weatherCoords', null);
  if (saved && typeof saved.lat === 'number' && typeof saved.lon === 'number') {
    coords = saved;
    fetchWeather(coords.lat, coords.lon, coords.label || 'Your location');
  } else {
    locateOnce();
  }

  // Periodic refresh reuses cached coords — never re-requests permission.
  setInterval(refresh, 30 * 60 * 1000);
}
