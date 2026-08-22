/**
 * ============================================================================
 * API CLIENT — REST API CONNECTOR & NETWORK LAYER
 * Aplikasi Database Guru SD Negeri Sumber Waru 2
 * ============================================================================
 */

const API_STORAGE_KEY = 'SDN_SW2_API_BASE_URL';
const JWT_STORAGE_KEY = 'jwt_token';
const DEFAULT_API_BASE = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

class ApiClient {
  constructor() {
    this.token = localStorage.getItem(JWT_STORAGE_KEY) || '';
    this.isOnline = navigator.onLine;
    this.isServerConnected = false;
    this.listeners = [];
    this._initNetworkWatchers();
    // Periksa koneksi server segera saat modul dimuat
    if (this.isOnline) {
      setTimeout(() => this.checkHealth(), 500);
    }
  }

  /**
   * Mendapatkan Base URL API dari konfigurasi lokal atau auto-detect
   * 
   * Prioritas:
   * 1. URL tersimpan di localStorage (dikonfigurasi user)
   * 2. Auto-detect: jika halaman dimuat dari http/https, gunakan origin yang sama
   * 3. Fallback ke localhost:3000
   */
  getBaseUrl() {
    const saved = localStorage.getItem(API_STORAGE_KEY);
    if (saved) return saved.replace(/\/+$/, '');
    
    // Auto-detect: Jika dimuat dari server (http:// atau https://), gunakan origin yang sama
    if (typeof window !== 'undefined' && window.location) {
      const { protocol, hostname, port } = window.location;
      if (protocol === 'http:' || protocol === 'https:') {
        // Bukan file:// → asumsikan backend dan frontend di host yang sama
        return window.location.origin.replace(/\/+$/, '');
      }
    }
    return DEFAULT_API_BASE.replace(/\/+$/, '');
  }

  /**
   * Mengatur Base URL API baru
   * @param {string} url 
   */
  setBaseUrl(url) {
    if (!url) return;
    const cleanUrl = url.trim().replace(/\/+$/, '');
    localStorage.setItem(API_STORAGE_KEY, cleanUrl);
    this.checkHealth();
  }

  /**
   * Mengatur atau memperbarui Token JWT
   * @param {string} token 
   */
  setToken(token) {
    this.token = token || '';
    if (this.token) {
      localStorage.setItem(JWT_STORAGE_KEY, this.token);
    } else {
      localStorage.removeItem(JWT_STORAGE_KEY);
    }
  }

  /**
   * Menghapus Token JWT (saat logout)
   */
  clearToken() {
    this.token = '';
    localStorage.removeItem(JWT_STORAGE_KEY);
  }

  /**
   * Inisialisasi pendeteksi koneksi jaringan
   */
  _initNetworkWatchers() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this._emit('NETWORK_ONLINE');
      // Periksa server setelah koneksi pulih
      setTimeout(() => this.checkHealth(), 800);
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.isServerConnected = false;
      this._emit('NETWORK_OFFLINE');
    });

    // Cek koneksi server secara periodik (setiap 30 detik jika tab aktif)
    setInterval(() => {
      if (document.visibilityState === 'visible' && this.isOnline) {
        this.checkHealth();
      }
    }, 30000);
  }

  /**
   * Melakukan HTTP Request dengan timeout dan header standar
   * @param {string} endpoint - Jalur endpoint (contoh: '/api/guru')
   * @param {Object} options - Opsi fetch (method, headers, body, dll)
   * @param {number} [timeoutMs=8000] - Batas waktu request
   */
  async request(endpoint, options = {}, timeoutMs = 8000) {
    const url = endpoint.startsWith('http') ? endpoint : `${this.getBaseUrl()}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    const token = this.token || localStorage.getItem(JWT_STORAGE_KEY) || '';

    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(options.headers || {})
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // Tangani respons 401 (Unauthorized / Token Expired)
      if (response.status === 401) {
        this._emit('AUTH_UNAUTHORIZED');
      }

      const contentType = response.headers.get('content-type') || '';
      let data = null;
      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = { message: await response.text() };
      }

      if (!response.ok) {
        const error = new Error(data.error || data.message || `HTTP ${response.status}: Terjadi kesalahan.`);
        error.status = response.status;
        error.code = data.code;
        error.data = data;
        throw error;
      }

      this.isServerConnected = true;
      return data;
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        const timeoutErr = new Error('Batas waktu request ke server habis (Timeout).');
        timeoutErr.code = 'TIMEOUT';
        this.isServerConnected = false;
        throw timeoutErr;
      }
      if (!navigator.onLine || err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
        this.isServerConnected = false;
        this._emit('SERVER_DISCONNECTED');
      }
      throw err;
    }
  }

  // HTTP Shortcuts
  get(endpoint, params = {}) {
    let url = endpoint;
    const query = new URLSearchParams();
    Object.keys(params).forEach(k => {
      if (params[k] !== undefined && params[k] !== null && params[k] !== '') {
        query.append(k, params[k]);
      }
    });
    const queryString = query.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
    return this.request(url, { method: 'GET' });
  }

  post(endpoint, body = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  put(endpoint, body = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body)
    });
  }

  patch(endpoint, body = {}) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body)
    });
  }

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }

  /**
   * Healthcheck server & database
   */
  async checkHealth() {
    try {
      const res = await this.request('/health', { method: 'GET' }, 3500);
      const wasConnected = this.isServerConnected;
      this.isServerConnected = true;
      if (!wasConnected) {
        this._emit('SERVER_CONNECTED', res);
      }
      return { connected: true, data: res };
    } catch (err) {
      const wasConnected = this.isServerConnected;
      this.isServerConnected = false;
      if (wasConnected) {
        this._emit('SERVER_DISCONNECTED', err);
      }
      return { connected: false, error: err.message };
    }
  }

  // ==========================================================================
  // AUTH SPECIFIC API
  // ==========================================================================
  async login(username, password) {
    const res = await this.post('/api/auth/login', { username, password });
    if (res && res.token) {
      this.setToken(res.token);
    }
    return res;
  }

  async getMe() {
    return this.get('/api/auth/me');
  }

  async changePassword(current_password, new_password) {
    return this.post('/api/auth/change-password', { current_password, new_password });
  }

  // ==========================================================================
  // SYNC SPECIFIC API
  // ==========================================================================
  async getSyncStatus() {
    return this.get('/api/sync/status');
  }

  async getAllState() {
    return this.get('/api/sync/all');
  }

  async pushAllState(stateData) {
    return this.post('/api/sync/all', { data: stateData });
  }

  async syncChanges(changes) {
    return this.post('/api/sync/changes', {
      clientId: window._CLIENT_ID || 'client-' + Date.now(),
      changes
    });
  }

  // ==========================================================================
  // EVENT SUBSCRIPTION
  // ==========================================================================
  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  _emit(eventType, payload = null) {
    this.listeners.forEach(cb => {
      try { cb({ type: eventType, payload, isServerConnected: this.isServerConnected, isOnline: this.isOnline }); }
      catch (e) { console.error('Error in Api listener:', e); }
    });
  }
}

// Global Singleton Instance
const Api = new ApiClient();
window.Api = Api;
