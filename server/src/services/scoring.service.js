import { findClosestTrustedDomain } from "../utils/domainSimilarity.js";

const getThreshold = (name, fallback) => {
  const value = Number(process.env[name]);
  return Number.isFinite(value) ? value : fallback;
};

export const calculateRuleBasedScore = (features) => {
  let score = 0;
  const reasons = [];

  if (features.length > 75) {
    score += 20;
    reasons.push("URL length is unusually high");
  }

  if (features.specialChars > 8) {
    score += 15;
    reasons.push("URL contains excessive special characters");
  }

  if (features.subdomainCount >= 3) {
    score += 20;
    reasons.push("URL has multiple nested subdomains");
  }

  if (features.entropy > 4.0) {
    score += 20;
    reasons.push("URL entropy indicates randomness/obfuscation");
  }

  if (features.protocol !== "https:") {
    score += 10;
    reasons.push("URL does not use HTTPS");
  }

  const { closestDomain, similarity } = findClosestTrustedDomain(features.hostname);
  if (closestDomain && similarity >= 70 && !features.hostname.endsWith(closestDomain)) {
    score += 25;
    reasons.push(`Domain is visually similar to trusted domain (${closestDomain})`);
  }

  return {
    score: Math.min(score, 100),
    reasons,
  };
};

export const classifyRisk = (score) => {
  const phishingThreshold = getThreshold("THRESHOLD_PHISHING", 70);
  const suspiciousThreshold = getThreshold("THRESHOLD_SUSPICIOUS", 40);

  if (score >= phishingThreshold) return "phishing";
  if (score >= suspiciousThreshold) return "suspicious";
  return "safe";
};
