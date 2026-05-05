import { MLFeedback } from "../models/MLFeedback.js";
import { MLDailyMetrics } from "../models/MLDailyMetrics.js";

const utcDateKey = (d = new Date()) => {
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const isPhishy = (status) => status === "phishing" || status === "suspicious";

export const createFeedback = async ({ incident, groundTruthStatus, notes = "" }) => {
  const predictedStatus = incident.status;
  const predictedPositive = isPhishy(predictedStatus);
  const truthPositive = isPhishy(groundTruthStatus);

  const isFalsePositive = predictedPositive && !truthPositive;
  const isFalseNegative = !predictedPositive && truthPositive;

  const feedback = await MLFeedback.create({
    incidentId: incident._id,
    incidentType: incident.type,
    predictedStatus,
    groundTruthStatus,
    isFalsePositive,
    isFalseNegative,
    notes,
  });

  const date = utcDateKey();
  const inc = {
    feedbackCount: 1,
    falsePositives: isFalsePositive ? 1 : 0,
    falseNegatives: isFalseNegative ? 1 : 0,
    truePositives: predictedPositive && truthPositive ? 1 : 0,
    trueNegatives: !predictedPositive && !truthPositive ? 1 : 0,
    [`byType.${incident.type}.feedbackCount`]: 1,
    [`byType.${incident.type}.falsePositives`]: isFalsePositive ? 1 : 0,
    [`byType.${incident.type}.falseNegatives`]: isFalseNegative ? 1 : 0,
  };

  await MLDailyMetrics.updateOne({ date }, { $inc: inc, $set: { updatedAt: new Date() } }, { upsert: true });

  return feedback;
};

export const getLatestDailyMetrics = async (days = 14) => {
  const limit = Math.max(1, Math.min(90, Number(days) || 14));
  const rows = await MLDailyMetrics.find({}).sort({ date: -1 }).limit(limit).lean();
  return rows.reverse();
};

