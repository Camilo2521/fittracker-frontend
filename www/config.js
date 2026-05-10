/**
 * FitTracker — Frontend Configuration
 * Modify this file to change API endpoints per environment.
 */

(function () {
  const BACKEND_PORT = 3000;

  // En Capacitor (Android/iOS) window.location.hostname es "" o "localhost",
  // pero la app necesita apuntar al PC de desarrollo por LAN.
  // Usa localStorage para sobreescribir en producción:
  //   localStorage.setItem('fittracker_backend_url', 'https://api.miservidor.com')
  function _resolveBaseUrl() {
    const override = localStorage.getItem('fittracker_backend_url');
    if (override) return override.replace(/\/+$/, '');

    const host = window.location.hostname;

    // Capacitor o fichero local — asumir localhost de desarrollo
    if (!host || host === 'localhost' || host === '127.0.0.1') {
      return `http://localhost:${BACKEND_PORT}`;
    }

    // Cualquier otro host (LAN, subdominio, etc.) → mismo host, puerto del backend
    return `http://${host}:${BACKEND_PORT}`;
  }

  const backendBase = _resolveBaseUrl();

  window.AppConfig = Object.freeze({

    api: {
      baseUrl:    `${backendBase}/api/v1`,
      backendUrl: backendBase,
      timeout:    10000,
    },

    app: {
      name:    'FitTracker',
      version: '3.0.0',
    },

  });
})();
