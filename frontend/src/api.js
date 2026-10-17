const API_BASE = '/api';
const ACCESS_KEY = 'cloudnotes_access';
const REFRESH_KEY = 'cloudnotes_refresh';

export function saveTokens(tokens) {
  sessionStorage.setItem(ACCESS_KEY, tokens.access);
  if (tokens.refresh) sessionStorage.setItem(REFRESH_KEY, tokens.refresh);
}

export function clearTokens() {
  sessionStorage.removeItem(ACCESS_KEY);
  sessionStorage.removeItem(REFRESH_KEY);
  sessionStorage.removeItem('cloudnotes_username');
}

async function send(path, { method, body, authenticated }, accessToken) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (authenticated && accessToken) headers.Authorization = `Bearer ${accessToken}`;
  return fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function parseResponse(response) {
  if (response.status === 204) return null;
  const raw = await response.text();
  let data = null;
  if (raw) {
    try { data = JSON.parse(raw); } catch { data = { detail: raw }; }
  }
  if (!response.ok) {
    let message = data?.detail || data?.message || `Request failed (${response.status})`;
    if (data && typeof data === 'object' && !data.detail && !data.message) {
      message = Object.entries(data)
        .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
        .join(' · ');
    } else if (typeof message !== 'string') {
      message = JSON.stringify(message);
    }
    throw new Error(message);
  }
  return data;
}

export async function apiRequest(path, { method = 'GET', body, authenticated = true } = {}) {
  let accessToken = sessionStorage.getItem(ACCESS_KEY);
  let response = await send(path, { method, body, authenticated }, accessToken);

  // Retry once with a refreshed access token when a protected request receives 401.
  if (response.status === 401 && authenticated && path !== '/auth/token/refresh/') {
    const refreshToken = sessionStorage.getItem(REFRESH_KEY);
    if (refreshToken) {
      const refreshResponse = await send('/auth/token/refresh/', {
        method: 'POST', body: { refresh: refreshToken }, authenticated: false,
      }, null);
      if (refreshResponse.ok) {
        const renewedTokens = await refreshResponse.json();
        saveTokens(renewedTokens);
        accessToken = renewedTokens.access;
        response = await send(path, { method, body, authenticated }, accessToken);
      } else {
        clearTokens();
        window.dispatchEvent(new Event('cloudnotes:session-expired'));
      }
    }
  }

  return parseResponse(response);
}
