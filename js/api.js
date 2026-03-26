/**
 * Shared API helper for all frontend JS files
 */
const API_BASE = 'http://localhost:3000/api';

async function apiFetch(endpoint, options = {}) {
  try {
    const headers = { 'Content-Type': 'application/json', ...options.headers };

    // Auto-attach JWT token if available
    const token = typeof getToken === 'function' ? getToken() : localStorage.getItem('fb_auth_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE}${endpoint}`, {
      headers,
      ...options
    });

    // If 401, clear auth and redirect to login
    if (res.status === 401) {
      localStorage.removeItem('fb_auth_token');
      localStorage.removeItem('fb_auth_user');
      // Only redirect if we're on a protected page
      const page = window.location.pathname;
      if (page.includes('dashboard') || page.includes('analytics')) {
        window.location.href = 'login.html';
        return;
      }
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || 'Request failed');
    }
    return await res.json();
  } catch (err) {
    console.error(`API error [${endpoint}]:`, err.message);
    throw err;
  }
}

window.apiFetch = apiFetch;
window.API_BASE = API_BASE;
