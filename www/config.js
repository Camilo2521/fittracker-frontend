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

    // URL hardcodeada en tiempo de build (inyectada por build.js para producción)
    // __PRODUCTION_BACKEND_URL__ es reemplazada por el script de build
    const buildUrl = '__PRODUCTION_BACKEND_URL__';
    if (buildUrl && !buildUrl.startsWith('__')) return buildUrl;

    const host = window.location.hostname;

    // Capacitor o fichero local — asumir localhost de desarrollo
    if (!host || host === 'localhost' || host === '127.0.0.1') {
      // Preferir HTTPS si el backend HTTPS está disponible
      const httpsPort = 3443;
      const httpPort  = BACKEND_PORT;
      return location.protocol === 'https:'
        ? `https://localhost:${httpsPort}`
        : `http://localhost:${httpPort}`;
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
