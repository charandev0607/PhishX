import { MLFeedback } from "../models/MLFeedback.js";
import { MLDailyMetrics } from "../models/MLDailyMetrics.js";
import { Incident } from "../models/Incident.js";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

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

const toPhishyLabel = (status) => (status === "safe" ? 0 : 1);

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const incrementalDir = resolve(repoRoot, "MLPipeline", "datasets", "incremental");

export const exportFeedbackToIncrementalDatasets = async ({ limit = 5000 } = {}) => {
  const feedbackRows = await MLFeedback.find({})
    .sort({ createdAt: -1 })
    .limit(Math.max(1, Number(limit) || 5000))
    .lean();

  const incidentIds = feedbackRows.map((row) => row.incidentId).filter(Boolean);
  const incidents = await Incident.find({ _id: { $in: incidentIds } }).select("type input metadata").lean();
  const incidentMap = new Map(incidents.map((incident) => [String(incident._id), incident]));

  const urlRows = [];
  const emailRows = [];
  const webpageRows = [];

  for (const fb of feedbackRows) {
    const incident = incidentMap.get(String(fb.incidentId));
    if (!incident) continue;
    const label = toPhishyLabel(fb.groundTruthStatus);

    if (incident.type === "url") {
      const url = String(incident.input || "").trim();
      if (url) urlRows.push({ url, label });
      continue;
    }

    if (incident.type === "email") {
      const subject = String(incident.metadata?.subject || incident.input || "").trim();
      const body = String(incident.metadata?.body || fb.notes || subject).trim();
      if (subject || body) emailRows.push({ subject, body, label });
      continue;
    }

    if (incident.type === "webpage") {
      const text = String(incident.metadata?.text || fb.notes || incident.input || "").trim();
      if (text) webpageRows.push({ text, label });
    }
  }

  await mkdir(incrementalDir, { recursive: true });
  await writeFile(resolve(incrementalDir, "url_train.jsonl"), urlRows.map((row) => JSON.stringify(row)).join("\n") + (urlRows.length ? "\n" : ""), "utf-8");
  await writeFile(
    resolve(incrementalDir, "email_train.jsonl"),
    emailRows.map((row) => JSON.stringify(row)).join("\n") + (emailRows.length ? "\n" : ""),
    "utf-8"
  );
  await writeFile(
    resolve(incrementalDir, "webpage_train.jsonl"),
    webpageRows.map((row) => JSON.stringify(row)).join("\n") + (webpageRows.length ? "\n" : ""),
    "utf-8"
  );

  return {
    exported: {
      url: urlRows.length,
      email: emailRows.length,
      webpage: webpageRows.length,
    },
  };
};

