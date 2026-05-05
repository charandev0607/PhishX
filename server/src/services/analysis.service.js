import { extractUrlFeatures } from "../utils/featureExtractor.js";
import { calculateRuleBasedScore, classifyRisk } from "./scoring.service.js";
import { getUrlMLScore } from "./ml.service.js";
import { validateSSLCertificate } from "../utils/sslValidator.js";
import { detectCredentialHarvestingSignals } from "../utils/credentialDetector.js";

export const analyzeUrl = async ({ url, pageHtml = "", scriptContent = "" }) => {
  const features = extractUrlFeatures(url);
  const ruleResult = calculateRuleBasedScore(features);
  let mlScore = 0;
  let mlUnavailable = false;
  try {
    mlScore = await getUrlMLScore({ url });
  } catch {
    mlUnavailable = true;
    mlScore = 0;
  }
  const sslResult = await validateSSLCertificate(url);
  const credentialSignals = detectCredentialHarvestingSignals({ pageHtml, scriptContent });

  const baseScore = Math.round(ruleResult.score * 0.6 + mlScore * 0.4);
  const sslPenalty = sslResult.valid ? 0 : 15;
  const finalScore = Math.min(100, baseScore + sslPenalty + credentialSignals.scoreDelta);
  const status = classifyRisk(finalScore);

  const reasons = [...ruleResult.reasons];
  if (mlUnavailable) {
    reasons.push("ML scoring service unavailable; using URL heuristics only");
  }
  reasons.push(...credentialSignals.reasons);
  if (mlScore >= 70) reasons.push("ML model flagged high phishing probability");
  if (mlScore >= 40 && mlScore < 70) reasons.push("ML model flagged suspicious pattern");
  if (!sslResult.valid) reasons.push(...sslResult.reasons);

  return {
    score: finalScore,
    status,
    reasons: [...new Set(reasons)],
    metadata: {
      features,
      ruleScore: ruleResult.score,
      mlScore,
      ssl: sslResult.metadata,
      credentialSignals: {
        scoreDelta: credentialSignals.scoreDelta,
      },
    },
  };
};
