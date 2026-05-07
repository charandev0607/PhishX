import { classifyRisk } from "./scoring.service.js";
import { getWebpageMLScore, isMlStrictModeEnabled } from "./ml.service.js";

const SUSPICIOUS_PATTERNS = [/verify/i, /urgent/i, /password/i, /account/i, /login/i, /bank/i, /otp/i];
const BRAND_PATTERNS = [/paypal/i, /microsoft/i, /google/i, /apple/i, /amazon/i, /outlook/i, /gmail/i];
const FORM_PATTERNS = [/sign in/i, /log in/i, /confirm identity/i, /security alert/i, /reset password/i];
const LINK_PATTERN = /https?:\/\/[^\s)"']+/gi;

export const analyzeWebpage = async ({ text = "" }) => {
  const reasons = [];
  let ruleScore = 0;
  let heuristicFloor = 0;
  let suspiciousHits = 0;
  let brandHits = 0;
  let formHits = 0;

  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(text)) {
      ruleScore += 10;
      reasons.push(`Rule-based detector matched pattern: ${pattern.source}`);
      suspiciousHits += 1;
    }
  }

  for (const pattern of BRAND_PATTERNS) {
    if (pattern.test(text)) {
      brandHits += 1;
    }
  }
  if (brandHits > 0) {
    ruleScore += Math.min(15, brandHits * 5);
    reasons.push("Webpage references commonly impersonated brands");
  }

  for (const pattern of FORM_PATTERNS) {
    if (pattern.test(text)) {
      formHits += 1;
    }
  }
  if (formHits > 0) {
    ruleScore += Math.min(15, formHits * 5);
    reasons.push("Webpage contains credential-capture style prompts");
  }

  const links = text.match(LINK_PATTERN) || [];
  if (links.length > 0) {
    ruleScore += Math.min(10, links.length * 2);
    reasons.push("Webpage contains outbound links");
  }

  if (text.length < 40) {
    reasons.push("Webpage text is sparse and low-context");
    ruleScore += 8;
  }

  if (brandHits > 0 && formHits > 0) {
    heuristicFloor = Math.max(heuristicFloor, 70);
  }

  if (suspiciousHits >= 3) {
    heuristicFloor = Math.max(heuristicFloor, 65);
  }

  if (brandHits > 0 && suspiciousHits >= 2) {
    heuristicFloor = Math.max(heuristicFloor, 75);
  }

  let mlScore = 0;
  let mlUnavailable = false;
  try {
    mlScore = await getWebpageMLScore({ text });
  } catch {
    mlUnavailable = true;
    if (isMlStrictModeEnabled()) {
      const err = new Error("ML webpage scoring service is unavailable");
      err.statusCode = 503;
      throw err;
    }
  }

  const score = Math.min(100, Math.max(Math.round(ruleScore * 0.4 + mlScore * 0.6), heuristicFloor));
  if (mlUnavailable) reasons.push("ML scoring service unavailable; using webpage heuristics only");
  if (mlScore >= 70) reasons.push("ML model flagged high phishing probability in webpage content");
  if (mlScore >= 40 && mlScore < 70) reasons.push("ML model flagged suspicious webpage signals");

  return {
    score,
    status: classifyRisk(score),
    reasons: [...new Set(reasons)],
    metadata: {
      ruleScore,
      heuristicFloor,
      mlScore,
      mlUnavailable,
      textLength: text.length,
      suspiciousHits,
      brandHits,
      formHits,
      linkCount: links.length,
    },
  };
};
