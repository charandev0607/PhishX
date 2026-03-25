const DEFAULT_ML_URL = "http://127.0.0.1:8010";

const withTimeout = async (promise, timeoutMs) => {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await promise(controller.signal);
  } finally {
    clearTimeout(t);
  }
};

const postJson = async (url, body, { timeoutMs = 900 } = {}) =>
  withTimeout(
    async (signal) => {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        signal,
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`ML service error ${res.status}: ${text}`);
      }
      return res.json();
    },
    timeoutMs
  );

export const getUrlMLScore = async ({ url }) => {
  const base = process.env.ML_SERVICE_URL || DEFAULT_ML_URL;
  const data = await postJson(`${base}/score/url`, { url });
  // Convert 0..1 probability to 0..100 score expected by analysis.service.js
  return Math.max(0, Math.min(100, Math.round(Number(data.score) * 100)));
};

export const getEmailMLScore = async ({ subject = "", body = "" }) => {
  const base = process.env.ML_SERVICE_URL || DEFAULT_ML_URL;
  const data = await postJson(`${base}/score/email`, { subject, body });
  return Math.max(0, Math.min(100, Math.round(Number(data.score) * 100)));
};

export const getWebpageMLScore = async ({ text = "" }) => {
  const base = process.env.ML_SERVICE_URL || DEFAULT_ML_URL;
  const data = await postJson(`${base}/score/webpage`, { text });
  return Math.max(0, Math.min(100, Math.round(Number(data.score) * 100)));
};
