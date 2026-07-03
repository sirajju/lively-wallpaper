/**
 * Aurora Desk — Interactive Lively Wallpaper
 * Entry point for all modules.
 */

import * as persistence from './js/persistence.js';
import { initBackground } from './js/background.js';
import { initInteraction } from './js/interaction.js';
import { initAmbient } from './js/ambient.js';
import { initFocusMode } from './js/focus-mode.js';
import { initSettings } from './js/settings.js';
import { initDrag } from './js/drag.js';

import { initClock } from './js/widgets/clock.js';
import { initGreeting } from './js/widgets/greeting.js';
import { initWeather } from './js/widgets/weather.js';
import { initCalendar } from './js/widgets/calendar.js';
import { initPomodoro } from './js/widgets/pomodoro.js';
import { initStopwatch } from './js/widgets/stopwatch.js';
import { initCountdown } from './js/widgets/countdown.js';
import { initTodo } from './js/widgets/todo.js';
import { initNotes } from './js/widgets/notes.js';
import { initSpotify } from './js/widgets/spotify.js';
import { initGitHub } from './js/widgets/github.js';
import { initSystem } from './js/widgets/system.js';
import { initWorldClock } from './js/widgets/world-clock.js';
import { initEvents } from './js/widgets/events.js';
import { initWeatherRadar } from './js/widgets/weather-radar.js';
import { initRSS } from './js/widgets/rss.js';
import { initMotivation } from './js/widgets/motivation.js';

/**
 * Run an initializer in isolation so one failure never blocks the rest.
 * @param {string} name
 * @param {() => void} fn
 */
function safeInit(name, fn) {
  try {
    fn();
  } catch (err) {
    console.error(`[Aurora Desk] ${name} failed:`, err);
  }
}

function init() {
  safeInit('persistence', () => persistence.initLivelyBridge());

  const badge = document.getElementById('env-badge');
  if (badge) {
    badge.textContent = persistence.isLivelyEnvironment() ? 'Lively' : 'Preview';
    badge.classList.toggle('is-lively', persistence.isLivelyEnvironment());
  }

  safeInit('background', initBackground);
  safeInit('interaction', initInteraction);
  safeInit('ambient', initAmbient);
  safeInit('focus-mode', initFocusMode);
  safeInit('settings', initSettings);

  const widgets = [
    initClock,
    initGreeting,
    initWeather,
    initCalendar,
    initPomodoro,
    initStopwatch,
    initCountdown,
    initTodo,
    initNotes,
    initSpotify,
    initGitHub,
    initSystem,
    initWorldClock,
    initEvents,
    initWeatherRadar,
    initRSS,
    initMotivation,
  ];

  widgets.forEach((fn) => safeInit(fn.name || 'widget', fn));

  safeInit('drag', initDrag);

  document.body.classList.add('is-ready');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
