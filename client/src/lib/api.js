let session = {
  accessToken: null,
  refreshToken: null,
};

let onSessionUpdate = null;
let onUnauthorized = null;
let refreshInFlight = null;

export const setApiSession = ({ accessToken, refreshToken }) => {
  session = { accessToken: accessToken || null, refreshToken: refreshToken || null };
};

export const setApiSessionUpdateHandler = (handler) => {
  onSessionUpdate = handler;
};

export const setApiUnauthorizedHandler = (handler) => {
  onUnauthorized = handler;
};

const refreshAccessToken = async () => {
  if (refreshInFlight) {
    return refreshInFlight;
  }
  refreshInFlight = (async () => {
    if (!session.refreshToken) return false;
    const res = await fetch("/api/v1/auth/refresh", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ refreshToken: session.refreshToken }),
    });
    if (!res.ok) return false;
    const json = await res.json();
    const nextAccess = json?.data?.accessToken;
    const nextRefresh = json?.data?.refreshToken;
    if (!nextAccess || !nextRefresh) return false;
    session = { accessToken: nextAccess, refreshToken: nextRefresh };
    if (onSessionUpdate) onSessionUpdate(session);
    return true;
  })();
  try {
    return await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
};

export const apiFetch = async (path, options = {}, { retryOn401 = true } = {}) => {
  const headers = {
    ...(options.headers || {}),
    ...(session.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {}),
  };

  const res = await fetch(path, { ...options, headers });
  if (res.status === 401 && retryOn401) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return apiFetch(path, options, { retryOn401: false });
    }
    session = { accessToken: null, refreshToken: null };
    if (onUnauthorized) onUnauthorized();
  }
  return res;
};

