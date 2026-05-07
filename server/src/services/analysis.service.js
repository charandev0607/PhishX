import { extractUrlFeatures } from "../utils/featureExtractor.js";
import { calculateRuleBasedScore, classifyRisk } from "./scoring.service.js";
import { getUrlMLScore, isMlStrictModeEnabled } from "./ml.service.js";
import { validateSSLCertificate } from "../utils/sslValidator.js";
import { detectCredentialHarvestingSignals } from "../utils/credentialDetector.js";

export const analyzeUrl = async ({ url, pageHtml = "", scriptContent = "" }) => {
  let features;
  try {
    features = extractUrlFeatures(url);
  } catch {
    const err = new Error("Invalid URL format");
    err.statusCode = 400;
    throw err;
  }
  const ruleResult = calculateRuleBasedScore(features);
  let mlScore = 0;
  let mlUnavailable = false;
  try {
    mlScore = await getUrlMLScore({ url });
  } catch {
    mlUnavailable = true;
    mlScore = 0;
    if (isMlStrictModeEnabled()) {
      const err = new Error("ML URL scoring service is unavailable");
      err.statusCode = 503;
      throw err;
    }
  }
  const sslResult = await validateSSLCertificate(url);
  const credentialSignals = detectCredentialHarvestingSignals({ pageHtml, scriptContent });

  const baseScore = Math.round(ruleResult.score * 0.6 + mlScore * 0.4);
  const sslPenalty = features.protocol === "https:" && !sslResult.valid ? 15 : 0;
  const heuristicFloor = Number(ruleResult.minimumScore || 0);
  const finalScore = Math.min(
    100,
    Math.max(baseScore + sslPenalty + credentialSignals.scoreDelta, heuristicFloor)
  );
  const status = classifyRisk(finalScore);

  const reasons = [...ruleResult.reasons];
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
      heuristicFloor,
      mlScore,
      ssl: sslResult.metadata,
      credentialSignals: {
        scoreDelta: credentialSignals.scoreDelta,
      },
      ml: {
        available: !mlUnavailable,
        fallback: mlUnavailable ? "heuristics_only" : "ml_plus_heuristics",
      },
    },
  };
};
