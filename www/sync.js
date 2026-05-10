/**
 * BackendSync — Puente HTTP entre IndexedDB local y la API REST Express.
 *
 * Estrategia offline-first:
 *   1. Los datos siempre se guardan primero en IndexedDB (via api.js).
 *   2. BackendSync intenta replicar la operación al backend de forma asíncrona.
 *   3. Si no hay conexión o el backend no responde, la operación se encola
 *      en localStorage y se reintenta automáticamente al volver online.
 *
 * Configuración:
 *   localStorage.setItem('fittracker_backend_url', 'https://tu-servidor.com')
 *
 * Uso (desde api.js u otros módulos):
 *   SYNC.syncWeight(75.5, '2024-01-15');   // fire-and-forget
 *   await SYNC.calculateMetrics(userId);    // espera respuesta Phase 4
 */

class BackendSync {
  constructor() {
    this._baseUrl        = null;
    this._userId         = null;
    this._queue          = [];
    this._refreshing     = null; // Promise in-flight, prevents concurrent refresh attempts
    this._loadQueue();
    window.addEventListener('online', () => this._flushQueue());
  }

  // ── CONFIGURACIÓN ───────────────────────────────────────────

  get baseUrl() {
    if (!this._baseUrl) {
      const stored  = localStorage.getItem('fittracker_backend_url');
      const derived = window.BACKEND
        ? window.BACKEND.replace('/api/v1', '')
        : (AppConfig?.api?.baseUrl?.replace('/api/v1', '') || 'http://localhost:3000');
      this._baseUrl = stored || derived;
    }
    return this._baseUrl;
  }

  get userId() {
    if (!this._userId) {
      this._userId = localStorage.getItem('fittracker_user_id') || '';
    }
    return this._userId;
  }

  setUserId(id) {
    this._userId = String(id);
    localStorage.setItem('fittracker_user_id', this._userId);
  }

  // ── GESTIÓN DE TOKENS ────────────────────────────────────────

  get _accessToken() {
    return localStorage.getItem('ft_access_token') || null;
  }

  get _refreshToken() {
    return localStorage.getItem('ft_refresh_token') || null;
  }

  _storeTokens({ accessToken, refreshToken }) {
    if (accessToken)  localStorage.setItem('ft_access_token', accessToken);
    if (refreshToken) localStorage.setItem('ft_refresh_token', refreshToken);
  }

  _clearTokens() {
    localStorage.removeItem('ft_access_token');
    localStorage.removeItem('ft_refresh_token');
    localStorage.removeItem('ft_token'); // limpia sesiones anteriores
  }

  // ── HTTP HELPERS ─────────────────────────────────────────────

  _headers() {
    const h = { 'Content-Type': 'application/json', 'x-user-id': this.userId };
    const token = this._accessToken;
    if (token) h['Authorization'] = `Bearer ${token}`;
    return h;
  }

  async _fetchOnce(method, path, body) {
    const opts = { method, headers: this._headers(), signal: AbortSignal.timeout(5000) };
    if (body !== undefined) opts.body = JSON.stringify(body);
    return fetch(`${this.baseUrl}${path}`, opts);
  }

  async _tryRefresh() {
    // Deduplicate: if a refresh is already in flight, wait for it
    if (this._refreshing) return this._refreshing;

    const raw = this._refreshToken;
    if (!raw) return false;

    this._refreshing = (async () => {
      try {
        const res = await fetch(`${this.baseUrl}/api/v1/auth/refresh`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ refreshToken: raw }),
          signal:  AbortSignal.timeout(5000),
        });
        if (!res.ok) { this._clearTokens(); return false; }
        const { accessToken } = await res.json();
        if (accessToken) {
          localStorage.setItem('ft_access_token', accessToken);
        }
        return !!accessToken;
      } catch {
        return false;
      } finally {
        this._refreshing = null;
      }
    })();

    return this._refreshing;
  }

  async _request(method, path, body) {
    if (!navigator.onLine) {
      this._enqueue(method, path, body);
      return null;
    }
    try {
      const res = await this._fetchOnce(method, path, body);

      if (res.status === 401) {
        const refreshed = await this._tryRefresh();
        if (!refreshed) return null;
        const retry = await this._fetchOnce(method, path, body);
        if (!retry.ok) return null;
        return await retry.json().catch(() => null);
      }

      if (!res.ok) return null;
      return await res.json().catch(() => null);
    } catch {
      this._enqueue(method, path, body);
      return null;
    }
  }

  // Rutas protegidas — devuelve null sin hacer la petición si no hay token
  _authGet(path)        { return this._accessToken ? this._request('GET',  path, undefined) : Promise.resolve(null); }
  _authPost(path, body) { return this._accessToken ? this._request('POST', path, body)      : Promise.resolve(null); }
  _authPut(path, body)  { return this._accessToken ? this._request('PUT',  path, body)      : Promise.resolve(null); }

  get isAuthenticated() { return !!this._accessToken; }

  _get(path)         { return this._request('GET',    path, undefined); }
  _post(path, body)  { return this._request('POST',   path, body);      }
  _put(path, body)   { return this._request('PUT',    path, body);      }

  // ── COLA OFFLINE ─────────────────────────────────────────────

  _loadQueue() {
    try {
      this._queue = JSON.parse(
        localStorage.getItem('fittracker_sync_queue') || '[]'
      );
    } catch { this._queue = []; }
  }

  _saveQueue() {
    try {
      // Limitar a 200 operaciones pendientes
      if (this._queue.length > 200) this._queue = this._queue.slice(-200);
      localStorage.setItem('fittracker_sync_queue', JSON.stringify(this._queue));
    } catch {}
  }

  _enqueue(method, path, body) {
    this._queue.push({ method, path, body });
    this._saveQueue();
  }

  async _flushQueue() {
    if (!this._queue.length || !navigator.onLine) return;
    const pending  = [...this._queue];
    this._queue    = [];
    this._saveQueue();

    for (const op of pending) {
      try {
        const opts = {
          method:  op.method,
          headers: this._headers(),
          signal:  AbortSignal.timeout(5000),
        };
        if (op.body !== undefined) opts.body = JSON.stringify(op.body);
        await fetch(`${this.baseUrl}${op.path}`, opts);
      } catch {
        // Si falla de nuevo, re-encolar (sin bucle infinito: máx intentos no implementados)
        this._queue.push(op);
      }
    }
    this._saveQueue();
  }

  // ── REGISTRO / LOGIN / LOGOUT ────────────────────────────────

  async registerUser(profile) {
    if (!profile?.externalId) return null;
    if (!profile.email || !profile.password) return null; // backend requiere ambos
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/auth/register`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          name:     profile.name     || '',
          email:    profile.email,
          password: profile.password,
          weight:   profile.weight || profile.currentWeight || null,
          goal:     profile.goal   || 'maintain',
        }),
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) return null;
      const data = await res.json().catch(() => null);
      if (data?.accessToken) this._storeTokens(data);
      return data;
    } catch {
      return null;
    }
  }

  async login(email, password) {
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/auth/login`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, password }),
        signal:  AbortSignal.timeout(5000),
      });
      if (!res.ok) return null;
      const data = await res.json().catch(() => null);
      if (data?.accessToken) this._storeTokens(data);
      return data;
    } catch {
      return null;
    }
  }

  async logout() {
    const refreshToken = this._refreshToken;
    if (refreshToken) {
      try {
        await fetch(`${this.baseUrl}/api/v1/auth/logout`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ refreshToken }),
          signal:  AbortSignal.timeout(3000),
        });
      } catch {}
    }
    this._clearTokens();
  }

  async deleteAccount(password) {
    if (!password) throw new Error('Se requiere la contraseña');
    const token = this._accessToken;
    if (!token) throw new Error('No hay sesión activa');
    const res = await fetch(`${this.baseUrl}/api/v1/auth/me`, {
      method:  'DELETE',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body:    JSON.stringify({ password }),
      signal:  AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Error al eliminar la cuenta');
    }
    this._clearTokens();
    return true;
  }

  // ── SYNC DE DATOS CORE (Phase 2) ─────────────────────────────
  // Estos datos viven en IndexedDB (offline-first). Las rutas legacy
  // /api/weights, /api/goals, etc. ya no existen en el backend v1.

  syncWeight()   { return Promise.resolve(null); }

  syncWorkout(type, durationMin, intensity, date) {
    if (!type) return Promise.resolve(null);
    return this._authPost('/api/v1/auth/workout-log', {
      date:        date || new Date().toISOString().slice(0, 10),
      routineName: type,
      exercises:   [{ name: type, intensity: intensity || 'medium', durationMin }],
      durationMin: durationMin || null,
    });
  }

  syncNutrition(){ return Promise.resolve(null); }
  syncMeal()     { return Promise.resolve(null); }
  syncCheck()    { return Promise.resolve(null); }
  syncWater()    { return Promise.resolve(null); }
  syncGoal()     { return Promise.resolve(null); }

  async syncUserProfile(data) {
    if (!data?.externalId) return null;
    return this._authPut('/api/v1/auth/profile', data);
  }

  // ── SYNC DE ML (Phase 3) ─────────────────────────────────────

  syncDetectedMeal() { return Promise.resolve(null); }

  async startRepSession(exerciseType) {
    return this._authPost('/api/v1/reps/sessions', {
      userId: this.userId,
      exerciseType,
    });
  }

  completeRepSession(sessionId, data) {
    return this._authPost(`/api/v1/reps/sessions/${sessionId}/complete`, data);
  }

  // ── PHASE 4: MÉTRICAS FÍSICAS ────────────────────────────────

  async calculateMetrics(physicalData = {}) {
    return this._authPost('/api/v1/progress/metrics', physicalData);
  }

  async generateRoutine() {
    return this._authPost('/api/v1/routines/generate', {});
  }

  async generateDiet(weekStart) {
    return this._authPost('/api/v1/diets/generate', { weekStart });
  }

  // Devuelve el array de datos aunque la respuesta sea paginada {data, total, ...}
  _unwrap(result) {
    if (!result) return [];
    return Array.isArray(result) ? result : (result.data || []);
  }

  async getWeeklyStats(week) {
    const result = await this._authGet(`/api/v1/auth/workout-logs?limit=100&offset=0`);
    const logs   = this._unwrap(result);
    if (!week) return logs;
    return logs.filter(log => log.date && log.date.startsWith(week.slice(0, 10)));
  }

  async getWorkoutLogs(limit = 20, offset = 0) {
    const result = await this._authGet(`/api/v1/auth/workout-logs?limit=${limit}&offset=${offset}`);
    return result || { data: [], total: 0, limit, offset };
  }

  async getDietLogs(limit = 20, offset = 0) {
    const result = await this._authGet(`/api/v1/auth/diet-logs?limit=${limit}&offset=${offset}`);
    return result || { data: [], total: 0, limit, offset };
  }

  async getProgressLogs(limit = 30, offset = 0) {
    const result = await this._authGet(`/api/v1/auth/progress-logs?limit=${limit}&offset=${offset}`);
    return result || { data: [], total: 0, limit, offset };
  }

  async getAiSuggestions(limit = 20, offset = 0) {
    const result = await this._authGet(`/api/v1/auth/ai-suggestions?limit=${limit}&offset=${offset}`);
    return result || { data: [], total: 0, limit, offset };
  }

  // ── UTILIDADES ───────────────────────────────────────────────

  async isAvailable() {
    try {
      const res = await fetch(`${this.baseUrl}/health`, {
        signal: AbortSignal.timeout(2000),
      });
      return res.ok;
    } catch { return false; }
  }

  get pendingCount() {
    return this._queue.length;
  }
}

// Instancia global
window.SYNC = new BackendSync();
