const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api/v1";
export const SOCKET_BASE = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

const STORAGE_KEY = "phishx.auth";

const toQueryString = (query = {}) => {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    params.set(key, String(value));
  });
  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
};

const parseResponse = async (response) => {
  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message = payload?.message || `Request failed (${response.status})`;
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return payload?.data ?? payload;
};

export const getStoredAuth = () => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
};

export const saveAuth = (auth) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
};

export const clearAuth = () => {
  localStorage.removeItem(STORAGE_KEY);
};

const refreshAccessToken = async (auth) => {
  if (!auth?.refreshToken) {
    throw new Error("Session expired. Please login again.");
  }

  const response = await fetch(`${API_BASE}/auth/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ refreshToken: auth.refreshToken }),
  });

  const refreshed = await parseResponse(response);
  const updated = {
    ...auth,
    accessToken: refreshed.accessToken,
    refreshToken: refreshed.refreshToken,
  };
  saveAuth(updated);
  return updated;
};

const request = async (path, options = {}, retry = true) => {
  const {
    method = "GET",
    body,
    query,
    auth: requiresAuth = true,
    headers = {},
  } = options;

  const currentAuth = getStoredAuth();
  const response = await fetch(`${API_BASE}${path}${toQueryString(query)}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(requiresAuth && currentAuth?.accessToken
        ? { Authorization: `Bearer ${currentAuth.accessToken}` }
        : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (response.status === 401 && requiresAuth && retry) {
    const updatedAuth = await refreshAccessToken(currentAuth);
    if (!updatedAuth?.accessToken) {
      throw new Error("Session expired. Please login again.");
    }
    return request(path, options, false);
  }

  return parseResponse(response);
};

export const login = async ({ email, password }) => {
  const data = await request("/auth/login", {
    method: "POST",
    auth: false,
    body: { email, password },
  });

  const auth = {
    user: data.user,
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
  };

  saveAuth(auth);
  return auth;
};

export const logout = async () => {
  const auth = getStoredAuth();
  if (auth?.refreshToken) {
    try {
      await request("/auth/logout", {
        method: "POST",
        body: { refreshToken: auth.refreshToken },
      });
    } catch {
      // Ignore logout errors and clear local auth anyway.
    }
  }

  clearAuth();
};

export const analyzeUrl = async ({ url, pageHtml = "", scriptContent = "" }) =>
  request("/url-analyze", {
    method: "POST",
    body: { url, pageHtml, scriptContent },
  });

export const analyzeEmail = async ({ subject, body }) =>
  request("/email-analyze", {
    method: "POST",
    body: { subject, body },
  });

export const getIncidents = async (filters = {}) =>
  request("/incidents", {
    query: filters,
  });

export const getSystemHealth = async () =>
  request("/system/health", {
    auth: false,
  });

export const getPollEvents = async ({ since } = {}) =>
  request("/events/poll", {
    query: { since },
  });

export const getUsers = async (filters = {}) =>
  request("/admin/users", {
    query: filters,
  });

export const updateUserRole = async ({ userId, role }) =>
  request(`/admin/users/${userId}/role`, {
    method: "PATCH",
    body: { role },
  });

export const getPolicies = async () => request("/admin/policies");

export const updatePolicies = async (payload) =>
  request("/admin/policies", {
    method: "PUT",
    body: payload,
  });

export const getCsrfMeta = async () =>
  request("/security/csrf-token", {
    auth: false,
  });
