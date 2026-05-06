import { apiFetch } from "../lib/api";

export const SOCKET_BASE = import.meta.env.VITE_SOCKET_URL || window.location.origin;

const parse = async (res) => {
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.message || `Request failed (${res.status})`);
  }
  return json?.data ?? json;
};

const toQuery = (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") query.set(k, String(v));
  });
  const q = query.toString();
  return q ? `?${q}` : "";
};

export const analyzeUrl = ({ url, pageHtml = "", scriptContent = "" }) =>
  apiFetch("/api/v1/url-analyze", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url, pageHtml, scriptContent }) }).then(parse);

export const analyzeEmail = ({ subject, body }) =>
  apiFetch("/api/v1/email-analyze", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ subject, body }) }).then(parse);

export const analyzeWebpage = ({ text, sourceUrl }) =>
  apiFetch("/api/v1/webpage-analyze", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text, sourceUrl }) }).then(parse);

export const getIncidents = (filters = {}) => apiFetch(`/api/v1/incidents${toQuery(filters)}`).then(parse);
export const getSystemHealth = () => apiFetch("/api/v1/system/health", {}, { retryOn401: false }).then(parse);
export const getPollEvents = ({ since } = {}) => apiFetch(`/api/v1/events/poll${toQuery({ since })}`).then(parse);
export const getUsers = (filters = {}) => apiFetch(`/api/v1/admin/users${toQuery(filters)}`).then(parse);
export const updateUserRole = ({ userId, role }) =>
  apiFetch(`/api/v1/admin/users/${userId}/role`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ role }) }).then(parse);
export const getPolicies = () => apiFetch("/api/v1/admin/policies").then(parse);
export const updatePolicies = (payload) =>
  apiFetch("/api/v1/admin/policies", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) }).then(parse);
export const getCsrfMeta = () => apiFetch("/api/v1/security/csrf-token", {}, { retryOn401: false }).then(parse);
