// Thin fetch wrapper around the backend API. All paths are relative to "/api"
// which Vite proxies to the Express server in development.

const TOKEN_KEY = 'qea_portal_token';
const USER_KEY = 'qea_portal_user';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => localStorage.setItem(TOKEN_KEY, t);
export const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
  } catch {
    return null;
  }
};
export const setStoredUser = (user) => localStorage.setItem(USER_KEY, JSON.stringify(user));
export const clearToken = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem('cz_admin_token');
  localStorage.removeItem('cz_admin_user');
};

async function request(path, { method = 'GET', body, auth = false, isForm = false } = {}) {
  const headers = {};
  if (auth) headers.Authorization = `Bearer ${getToken()}`;
  if (body && !isForm) headers['Content-Type'] = 'application/json';

  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: isForm ? body : body ? JSON.stringify(body) : undefined,
  });

  // An expired/invalid admin token on an authed request: clear the dead session
  // and signal the app so it can bounce the user back to the login screen
  // (instead of silently 401-ing every add/update/delete).
  if (res.status === 401 && auth) {
    clearToken();
    sessionStorage.setItem('cz_session_expired', '1');
    window.dispatchEvent(new Event('cz-unauthorized'));
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export const api = {
  // public
  getConfig: () => request('/config'),
  listAgents: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v)
    ).toString();
    return request(`/agents${qs ? `?${qs}` : ''}`);
  },
  getAgent: (id) => request(`/agents/${id}`),
  getFeedback: (id) => request(`/agents/${id}/feedback`),
  submitFeedback: (id, body) =>
    request(`/agents/${id}/feedback`, { method: 'POST', body }),
  submitRequest: (formData) =>
    request('/requests', { method: 'POST', body: formData, auth: true, isForm: true }),
  askAssistant: (message) => request('/assistant', { method: 'POST', body: { message } }),

  // auth
  login: (username, password, role) =>
    request('/auth/login', { method: 'POST', body: { username, password, role } }),
  register: (payload) => request('/auth/register', { method: 'POST', body: payload }),

  // admin
  createAgent: (formData) =>
    request('/agents', { method: 'POST', body: formData, auth: true, isForm: true }),
  updateAgent: (id, formData) =>
    request(`/agents/${id}`, { method: 'PUT', body: formData, auth: true, isForm: true }),
  deleteAgent: (id) => request(`/agents/${id}`, { method: 'DELETE', auth: true }),
  listRequests: () => request('/requests', { auth: true }),
  updateRequestStatus: (id, status) =>
    request(`/requests/${id}`, { method: 'PATCH', body: { status }, auth: true }),
  publishRequest: (id) => request(`/requests/${id}/publish`, { method: 'POST', auth: true }),
  deleteRequest: (id) => request(`/requests/${id}`, { method: 'DELETE', auth: true }),

  // access / associate management
  myAccess: () => request('/access/me', { auth: true }),
  requestAccess: (message) => request('/access/request', { method: 'POST', body: { message }, auth: true }),
  listAccessRequests: () => request('/access/requests', { auth: true }),
  decideAccessRequest: (id, status) =>
    request(`/access/requests/${id}`, { method: 'PATCH', body: { status }, auth: true }),
  listAssociates: () => request('/access/associates', { auth: true }),
  addAssociate: (body) => request('/access/associates', { method: 'POST', body, auth: true }),
  removeAssociate: (id) => request(`/access/associates/${id}`, { method: 'DELETE', auth: true }),
};

// URL to stream a GridFS video by id.
export const videoUrl = (fileId) => `/api/videos/${fileId}`;

// URL to view (or download) a request/agent attachment by GridFS id.
export const attachmentUrl = (fileId, { download = false } = {}) =>
  `/api/requests/attachment/${fileId}${download ? '?download=1' : ''}`;
