const DEFAULT_ML_URL = "http://127.0.0.1:8010";

export const isMlStrictModeEnabled = () => process.env.ML_STRICT_MODE === "true";

const withTimeout = async (promise, timeoutMs) => {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await promise(controller.signal);
  } finally {
    clearTimeout(t);
  }
};

const DEFAULT_ML_TIMEOUT_MS = Number(process.env.ML_REQUEST_TIMEOUT_MS || 5000);

const postJson = async (url, body, { timeoutMs = DEFAULT_ML_TIMEOUT_MS } = {}) =>
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
  return {
    score: Math.max(0, Math.min(100, Math.round(Number(data.score) * 100))),
    probability: Math.max(0, Math.min(100, Math.round(Number(data.probability) * 100))),
    threshold: Math.max(0, Math.min(100, Math.round(Number(data.threshold) * 100))),
    confidence: Math.max(0, Math.min(100, Math.round(Number(data.confidence) * 100))),
    decision: data.decision || "safe",
    model: data.model || "url_logreg",
    version: data.version,
    details: data.features || {},
  };
};

export const getEmailMLScore = async ({ subject = "", body = "" }) => {
  const base = process.env.ML_SERVICE_URL || DEFAULT_ML_URL;
  const data = await postJson(`${base}/score/email`, { subject, body });
  return {
    score: Math.max(0, Math.min(100, Math.round(Number(data.score) * 100))),
    probability: Math.max(0, Math.min(100, Math.round(Number(data.probability) * 100))),
    threshold: Math.max(0, Math.min(100, Math.round(Number(data.threshold) * 100))),
    confidence: Math.max(0, Math.min(100, Math.round(Number(data.confidence) * 100))),
    decision: data.decision || "safe",
    model: data.model || "email_tfidf_logreg",
    version: data.version,
  };
};

export const getWebpageMLScore = async ({ text = "" }) => {
  const base = process.env.ML_SERVICE_URL || DEFAULT_ML_URL;
  const data = await postJson(`${base}/score/webpage`, { text });
  return {
    score: Math.max(0, Math.min(100, Math.round(Number(data.score) * 100))),
    probability: Math.max(0, Math.min(100, Math.round(Number(data.probability) * 100))),
    threshold: Math.max(0, Math.min(100, Math.round(Number(data.threshold) * 100))),
    confidence: Math.max(0, Math.min(100, Math.round(Number(data.confidence) * 100))),
    decision: data.decision || "safe",
    model: data.model || "webpage_signals_rf",
    version: data.version,
    details: data.signals || {},
  };
};
