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
const THREAT_PATTERNS = [/invoice/i, /suspended/i, /verify/i, /crypto/i, /wallet/i, /gift card/i];
const IMPERSONATION_PATTERNS = [/paypal/i, /microsoft/i, /google/i, /apple/i, /amazon/i, /bank/i];

const LINK_PATTERN = /(https?:\/\/[^\s)"']+)/gi;

export const analyzeEmail = async ({ subject = "", body = "" }) => {
  const text = `${subject}\n${body}`;
  const reasons = [];
  let ruleScore = 0;
  let heuristicFloor = 0;
  let urgencyHit = false;
  let credentialHit = false;
  let threatPatternHits = 0;
  let impersonationHit = false;
  let lookalikeLinkHit = false;

  for (const pattern of URGENCY_PATTERNS) {
    if (pattern.test(text)) {
      ruleScore += 10;
      reasons.push("Urgency language detected in email");
      urgencyHit = true;
      break;
    }
  }

  for (const pattern of CREDENTIAL_PATTERNS) {
    if (pattern.test(text)) {
      ruleScore += 12;
      reasons.push("Credential or account-sensitive language detected");
      credentialHit = true;
      break;
    }
  }

  for (const pattern of THREAT_PATTERNS) {
    if (pattern.test(text)) {
      threatPatternHits += 1;
    }
  }
  if (threatPatternHits > 0) {
    ruleScore += Math.min(18, threatPatternHits * 6);
    reasons.push("Additional phishing-themed language detected");
  }

  for (const pattern of IMPERSONATION_PATTERNS) {
    if (pattern.test(text)) {
      impersonationHit = true;
      ruleScore += 10;
      reasons.push("Email references a commonly impersonated brand or institution");
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
        lookalikeLinkHit = true;
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

  if (urgencyHit && credentialHit) {
    heuristicFloor = Math.max(heuristicFloor, 65);
  }

  if (lookalikeLinkHit) {
    heuristicFloor = Math.max(heuristicFloor, 75);
  }

  if (impersonationHit && credentialHit) {
    heuristicFloor = Math.max(heuristicFloor, 70);
  }

  if (impersonationHit && urgencyHit && links.length > 0) {
    heuristicFloor = Math.max(heuristicFloor, 70);
  }

  ruleScore = Math.min(100, ruleScore);

  let ml = null;
  let mlScore = 0;
  let mlUnavailable = false;
  try {
    ml = await getEmailMLScore({ subject, body });
    mlScore = ml.score;
  } catch {
    mlUnavailable = true;
    mlScore = 0;
    if (isMlStrictModeEnabled()) {
      const err = new Error("ML email scoring service is unavailable");
      err.statusCode = 503;
      throw err;
    }
  }

  const score = Math.min(100, Math.max(Math.round(ruleScore * 0.6 + mlScore * 0.4), heuristicFloor));
  if (mlUnavailable) {
    reasons.push("ML scoring service unavailable; using email heuristics only");
  } else {
    if (ml?.decision === "phishing" && mlScore >= 70) reasons.push("ML model flagged high phishing probability");
    if (mlScore >= 40 && mlScore < 70) reasons.push("ML model flagged suspicious pattern");
  }

  return {
    score,
    status: classifyRisk(score),
    reasons: [...new Set(reasons)],
    metadata: {
      ruleScore,
      heuristicFloor,
      mlScore,
      mlUnavailable,
      ml: mlUnavailable
        ? { available: false, fallback: "heuristics_only" }
        : {
            available: true,
            fallback: "ml_plus_heuristics",
            probability: ml?.probability ?? null,
            threshold: ml?.threshold ?? null,
            confidence: ml?.confidence ?? null,
            decision: ml?.decision ?? null,
            model: ml?.model ?? null,
            version: ml?.version ?? null,
          },
      linkCount: links.length,
      subjectLength: subject.length,
      bodyLength: body.length,
      urgencyHit,
      credentialHit,
      lookalikeLinkHit,
      impersonationHit,
    },
  };
};
