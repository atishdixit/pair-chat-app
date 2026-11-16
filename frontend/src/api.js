// In production the backend serves this frontend itself, so API and WebSocket
// calls go to the same origin (empty base). In dev, Vite runs on another port,
// so default to the backend on :4000.
const API_BASE =
  import.meta.env.VITE_API_BASE ??
  (import.meta.env.PROD ? '' : 'http://localhost:4000');

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Request failed (HTTP ${res.status})`);
  }

  return res.status === 204 ? null : res.json();
}

export const api = {
  login: (username, password) =>
    request('/api/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  logout: () => request('/api/logout', { method: 'POST' }),
  me: () => request('/api/me'),
  messages: () => request('/api/messages'),
  base: API_BASE
};
