import { classifyRisk } from "./scoring.service.js";
import { findClosestTrustedDomain } from "../utils/domainSimilarity.js";

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
  let score = 0;

  for (const pattern of URGENCY_PATTERNS) {
    if (pattern.test(text)) {
      score += 10;
      reasons.push("Urgency language detected in email");
      break;
    }
  }

  for (const pattern of CREDENTIAL_PATTERNS) {
    if (pattern.test(text)) {
      score += 12;
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
        score += 20;
        reasons.push(`Email contains lookalike link (${hostname})`);
      }

      if (!hostname.includes(".")) {
        score += 8;
        reasons.push("Email contains malformed link host");
      }
    } catch (_error) {
      score += 5;
      reasons.push("Email contains malformed URL-like text");
    }
  }

  if (links.length === 0) {
    score = Math.max(0, score - 5);
  }

  score = Math.min(100, score);

  return {
    score,
    status: classifyRisk(score),
    reasons: [...new Set(reasons)],
    metadata: {
      linkCount: links.length,
      subjectLength: subject.length,
      bodyLength: body.length,
    },
  };
};
