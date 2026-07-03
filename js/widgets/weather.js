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

  function locate() {
    if (!navigator.geolocation) {
      if (statusEl) statusEl.textContent = 'Location not supported';
      fetchWeather(40.71, -74.01, 'New York (default)');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        coords = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        fetchWeather(coords.lat, coords.lon, 'Your location');
      },
      () => {
        if (statusEl) statusEl.textContent = 'Location denied — using default';
        fetchWeather(51.51, -0.13, 'London (default)');
      },
      { timeout: 10000 }
    );
  }

  persistence.subscribe((key) => {
    if (key === 'weatherUnits' && coords) fetchWeather(coords.lat, coords.lon, 'Your location');
  });

  locate();
  setInterval(locate, 30 * 60 * 1000);
}
