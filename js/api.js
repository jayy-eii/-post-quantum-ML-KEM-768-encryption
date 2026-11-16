/**
 * QUANTUM-SAFE Enterprise API Client
 * Manages HTTP communication with the Node.js authentication server,
 * JWT token storage, session validation, and real-time backend synchronization.
 */

window.QS_API = (function () {
  const TOKEN_KEY = 'qs_jwt_token';
  const USER_KEY = 'qs_authenticated_user';

  // Determine API base url dynamically
  function getBaseUrl() {
    if (window.location.protocol.startsWith('http')) {
      // If we are served from port 3000, use relative paths
      if (window.location.port === '3000' || window.location.port === '') {
        return '';
      }
      return `${window.location.protocol}//${window.location.hostname}:3000`;
    }
    // Default fallback when opened via file://
    return 'http://localhost:3000';
  }

  const BASE_URL = getBaseUrl();

  function getToken() {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  }

  function setSession(token, user) {
    try {
      localStorage.setItem(TOKEN_KEY, token);
      if (user) {
        localStorage.setItem(USER_KEY, JSON.stringify(user));
      }
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
  }

  function clearSession() {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch (e) {
      console.warn('LocalStorage clear failed:', e);
    }
  }

  function getStoredUser() {
    try {
      const data = localStorage.getItem(USER_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  function isAuthenticated() {
    return Boolean(getToken());
  }

  async function request(endpoint, options = {}) {
    const url = `${BASE_URL}${endpoint}`;
    const token = getToken();

    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const res = await fetch(url, {
        ...options,
        headers
      });

      const contentType = res.headers.get('content-type') || '';
      let data = null;
      if (contentType.includes('application/json')) {
        data = await res.json();
      } else {
        data = await res.text();
      }

      if (!res.ok) {
        // If 401 Unauthorized, automatically clear invalid session
        if (res.status === 401 && endpoint !== '/api/auth/login') {
          clearSession();
          if (window.QS_DATA) window.QS_DATA.currentUser = null;
          if (window.QS_ROUTER && window.QS_ROUTER.currentRoute !== 'login' && window.QS_ROUTER.currentRoute !== 'landing') {
            window.QS_ROUTER.navigate('login');
          }
        }

        const errorMessage = (data && data.error) || (data && data.message) || `Request failed with status ${res.status}`;
        return {
          success: false,
          status: res.status,
          error: errorMessage,
          data
        };
      }

      return {
        success: true,
        status: res.status,
        ...data
      };
    } catch (networkError) {
      console.warn(`[QS_API] Network error connecting to ${url}:`, networkError);
      return {
        success: false,
        status: 0,
        error: 'Unable to connect to Quantum-Safe backend service. Ensure the server is running on port 3000.',
        networkError
      };
    }
  }

  return {
    getBaseUrl,
    getToken,
    getStoredUser,
    isAuthenticated,
    setSession,
    clearSession,

    /**
     * Check if backend service is available
     */
    async checkHealth() {
      try {
        const res = await fetch(`${BASE_URL}/api/health`);
        return res.ok;
      } catch {
        return false;
      }
    },

    /**
     * Register new user identity
     */
    async register({ name, email, password }) {
      const res = await request('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password })
      });

      if (res.success && res.token && res.user) {
        setSession(res.token, res.user);
      }
      return res;
    },

    /**
     * Authenticate existing identity
     */
    async login({ email, password }) {
      const res = await request('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });

      if (res.success && res.token && res.user) {
        setSession(res.token, res.user);
      }
      return res;
    },

    /**
     * Validate session and get current profile
     */
    async getProfile() {
      const token = getToken();
      if (!token) {
        return { success: false, error: 'No active session' };
      }

      const res = await request('/api/auth/me', {
        method: 'GET'
      });

      if (res.success && res.user) {
        try {
          localStorage.setItem(USER_KEY, JSON.stringify(res.user));
        } catch {}
      }
      return res;
    },

    /**
     * Update user profile information
     */
    async updateProfile({ name, organization, role }) {
      const res = await request('/api/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({ name, organization, role })
      });

      if (res.success && res.user) {
        try {
          localStorage.setItem(USER_KEY, JSON.stringify(res.user));
        } catch {}
      }
      return res;
    },

    /**
     * Terminate user session
     */
    async logout() {
      try {
        await request('/api/auth/logout', { method: 'POST' });
      } catch {}
      clearSession();
      return { success: true };
    },

    /**
     * Fetch audit logs from database
     */
    async getLogs() {
      return await request('/api/logs', {
        method: 'GET'
      });
    },

    /**
     * Fetch registered peers for private chat
     */
    async getUsers() {
      return await request('/api/users', {
        method: 'GET'
      });
    },

    /**
     * Provision a network peer for instant 1-to-1 testing
     */
    async provisionDemoPeer() {
      return await request('/api/peers/provision-demo', {
        method: 'POST'
      });
    },

    /**
     * Fetch conversation messages with a specific peer
     */
    async getMessages(peerId) {
      return await request(`/api/messages?peerId=${encodeURIComponent(peerId)}`, {
        method: 'GET'
      });
    },

    /**
     * Send encrypted 1-to-1 message to peer
     */
    async sendMessage({ receiverId, text, ciphertext, nonce, authTag, pqcSessionKeyId }) {
      return await request('/api/messages', {
        method: 'POST',
        body: JSON.stringify({ receiverId, text, ciphertext, nonce, authTag, pqcSessionKeyId })
      });
    },

    /**
     * Fetch real-time dashboard telemetry & metrics
     */
    async getStats() {
      return await request('/api/dashboard/stats', {
        method: 'GET'
      });
    },

    /**
     * Perform ML-KEM-768 post-quantum key encapsulation with a peer
     */
    async encapsulate(peerId) {
      return await request('/api/crypto/encapsulate', {
        method: 'POST',
        body: JSON.stringify({ peerId })
      });
    },

    /**
     * Execute live NIST FIPS 203 verification pipeline & benchmark
     */
    async verifyPipeline() {
      return await request('/api/crypto/verify-pipeline', {
        method: 'POST'
      });
    },

    /**
     * Fetch user's encrypted files from the vault
     */
    async getFiles() {
      return await request('/api/files', {
        method: 'GET'
      });
    },

    /**
     * Upload and encrypt file with ML-KEM-768 + AES-256-GCM
     */
    async uploadFile({ fileName, fileSize, mimeType, fileData }) {
      return await request('/api/files/upload', {
        method: 'POST',
        body: JSON.stringify({ fileName, fileSize, mimeType, fileData })
      });
    },

    /**
     * Delete an encrypted file from the vault
     */
    async deleteFile(id) {
      return await request('/api/files', {
        method: 'DELETE',
        body: JSON.stringify({ id })
      });
    },

    /**
     * Construct authenticated file download URL
     */
    getDownloadUrl(id) {
      const token = getToken();
      return `${BASE_URL}/api/files/download?id=${encodeURIComponent(id)}${token ? `&auth=${encodeURIComponent(token)}` : ''}`;
    }
  };
})();
