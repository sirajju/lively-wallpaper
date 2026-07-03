/**
 * System info widget — browser APIs + Lively system information.
 */

export function initSystem() {
  const el = document.getElementById('system-widget');
  if (!el) return;

  const rows = {
    battery: el.querySelector('[data-sys="battery"]'),
    network: el.querySelector('[data-sys="network"]'),
    memory: el.querySelector('[data-sys="memory"]'),
    cores: el.querySelector('[data-sys="cores"]'),
    connection: el.querySelector('[data-sys="connection"]'),
    cpu: el.querySelector('[data-sys="cpu"]'),
    gpu: el.querySelector('[data-sys="gpu"]'),
    ram: el.querySelector('[data-sys="ram"]'),
  };

  if (rows.cores) rows.cores.textContent = `${navigator.hardwareConcurrency || '?'} cores`;

  const mem = navigator.deviceMemory;
  if (rows.memory) rows.memory.textContent = mem ? `${mem} GB device memory` : 'Memory N/A';

  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (rows.connection && conn) {
    rows.connection.textContent = `${conn.effectiveType || 'unknown'} · ${conn.downlink || '?'} Mbps`;
  } else if (rows.connection) {
    rows.connection.textContent = 'Connection info N/A';
  }

  if (rows.network) {
    rows.network.textContent = navigator.onLine ? 'Online' : 'Offline';
  }

  window.addEventListener('online', () => {
    if (rows.network) rows.network.textContent = 'Online';
  });
  window.addEventListener('offline', () => {
    if (rows.network) rows.network.textContent = 'Offline';
  });

  if ('getBattery' in navigator) {
    navigator.getBattery().then((bat) => {
      function updateBat() {
        if (rows.battery) {
          rows.battery.textContent = `${Math.round(bat.level * 100)}%${bat.charging ? ' (charging)' : ''}`;
        }
      }
      updateBat();
      bat.addEventListener('levelchange', updateBat);
      bat.addEventListener('chargingchange', updateBat);
    }).catch(() => {
      if (rows.battery) rows.battery.textContent = 'Battery N/A';
    });
  } else if (rows.battery) {
    rows.battery.textContent = 'Battery N/A';
  }

  const prev = window.livelySystemInformation;
  window.livelySystemInformation = function livelySystemInformation(data) {
    try {
      const obj = JSON.parse(data);
      if (rows.cpu) rows.cpu.textContent = `${obj.NameCpu}: ${obj.CurrentCpu?.toFixed(1)}%`;
      if (rows.gpu) rows.gpu.textContent = `${obj.NameGpu}: ${obj.CurrentGpu3D?.toFixed(1)}%`;
      if (rows.ram) {
        const used = obj.TotalRam - obj.CurrentRamAvail;
        rows.ram.textContent = `${used} / ${obj.TotalRam} MB RAM`;
      }
      if (rows.connection && obj.NameNetCard) {
        const down = ((obj.CurrentNetDown * 8) / (1024 * 1024)).toFixed(1);
        rows.connection.textContent = `${obj.NameNetCard}: ${down} Mb/s ↓`;
      }
    } catch {
      /* noop */
    }
    if (typeof prev === 'function') prev(data);
  };
}
