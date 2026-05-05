import { classifyRisk } from "./scoring.service.js";
import { findClosestTrustedDomain } from "../utils/domainSimilarity.js";
import { getEmailMLScore, isMlStrictModeEnabled } from "./ml.service.js";

const URGENCY_PATTERNS = [
  /urgent/i,
  /immediately/i,
  /verify your account/i,
  /suspended/i,
  /action required/i,
  /reset password/i,
];

const CREDENTIAL_PATTERNS = [/login/i, /password/i, /otp/i, /security code/i, /bank/i, /payment/i];

const LINK_PATTERN = /(https?:\/\/[^\s)"']+)/gi;

export const analyzeEmail = async ({ subject = "", body = "" }) => {
  const text = `${subject}\n${body}`;
  const reasons = [];
  let ruleScore = 0;

  for (const pattern of URGENCY_PATTERNS) {
    if (pattern.test(text)) {
      ruleScore += 10;
      reasons.push("Urgency language detected in email");
      break;
    }
  }

  for (const pattern of CREDENTIAL_PATTERNS) {
    if (pattern.test(text)) {
      ruleScore += 12;
      reasons.push("Credential or account-sensitive language detected");
      break;
    }
  }

  const links = text.match(LINK_PATTERN) || [];
  for (const link of links.slice(0, 8)) {
    try {
      const hostname = new URL(link).hostname;
      const { closestDomain, similarity } = findClosestTrustedDomain(hostname);
      if (closestDomain && similarity >= 70 && !hostname.endsWith(closestDomain)) {
        ruleScore += 20;
        reasons.push(`Email contains lookalike link (${hostname})`);
      }

      if (!hostname.includes(".")) {
        ruleScore += 8;
        reasons.push("Email contains malformed link host");
      }
    } catch (_error) {
      ruleScore += 5;
      reasons.push("Email contains malformed URL-like text");
    }
  }

  if (links.length === 0) {
    ruleScore = Math.max(0, ruleScore - 5);
  }

  ruleScore = Math.min(100, ruleScore);

  let mlScore = 0;
  let mlUnavailable = false;
  try {
    mlScore = await getEmailMLScore({ subject, body });
  } catch {
    mlUnavailable = true;
    mlScore = 0;
    if (isMlStrictModeEnabled()) {
      const err = new Error("ML email scoring service is unavailable");
      err.statusCode = 503;
      throw err;
    }
  }

  const score = Math.min(100, Math.round(ruleScore * 0.6 + mlScore * 0.4));
  if (mlUnavailable) {
    reasons.push("ML scoring service unavailable; using email heuristics only");
  } else {
    if (mlScore >= 70) reasons.push("ML model flagged high phishing probability");
    if (mlScore >= 40 && mlScore < 70) reasons.push("ML model flagged suspicious pattern");
  }

  return {
    score,
    status: classifyRisk(score),
    reasons: [...new Set(reasons)],
    metadata: {
      ruleScore,
      mlScore,
      mlUnavailable,
      linkCount: links.length,
      subjectLength: subject.length,
      bodyLength: body.length,
    },
  };
};
