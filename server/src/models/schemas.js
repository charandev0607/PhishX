const VALID_SEVERITY = new Set(["low", "medium", "high", "critical"]);
const VALID_THREAT_TYPES = new Set([
  "phishing",
  "malware",
  "spam",
  "credential_harvesting",
  "zero_day",
]);

export function validateIncident(payload) {
  const errors = [];

  if (!payload || typeof payload !== "object") {
    return ["Request body must be a JSON object."];
  }

  if (!payload.type || !VALID_THREAT_TYPES.has(payload.type)) {
    errors.push("type must be one of phishing, malware, spam, credential_harvesting, zero_day.");
  }

  if (!payload.severity || !VALID_SEVERITY.has(payload.severity)) {
    errors.push("severity must be one of low, medium, high, critical.");
  }

  if (typeof payload.threatScore !== "number" || payload.threatScore < 0 || payload.threatScore > 100) {
    errors.push("threatScore must be a number between 0 and 100.");
  }

  if (!payload.targetUrl || typeof payload.targetUrl !== "string") {
    errors.push("targetUrl is required and must be a string.");
  }

  return errors;
}