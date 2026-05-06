import { classifyRisk } from "./scoring.service.js";
import { getWebpageMLScore, isMlStrictModeEnabled } from "./ml.service.js";

const SUSPICIOUS_PATTERNS = [/verify/i, /urgent/i, /password/i, /account/i, /login/i, /bank/i, /otp/i];

export const analyzeWebpage = async ({ text = "" }) => {
  const reasons = [];
  let ruleScore = 0;

  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(text)) {
      ruleScore += 10;
      reasons.push(`Rule-based detector matched pattern: ${pattern.source}`);
    }
  }

  if (text.length < 40) {
    reasons.push("Webpage text is sparse and low-context");
    ruleScore += 8;
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

  const score = Math.min(100, Math.round(ruleScore * 0.4 + mlScore * 0.6));
  if (mlUnavailable) reasons.push("ML scoring service unavailable; using webpage heuristics only");
  if (mlScore >= 70) reasons.push("ML model flagged high phishing probability in webpage content");
  if (mlScore >= 40 && mlScore < 70) reasons.push("ML model flagged suspicious webpage signals");

  return {
    score,
    status: classifyRisk(score),
    reasons: [...new Set(reasons)],
    metadata: {
      ruleScore,
      mlScore,
      mlUnavailable,
      textLength: text.length,
    },
  };
};
