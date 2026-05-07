import mongoose from "mongoose";
import { execFile } from "node:child_process";
import { access } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { Incident } from "../models/Incident.js";
import { createFeedback, exportFeedbackToIncrementalDatasets, getLatestDailyMetrics } from "../services/mlMonitoring.service.js";
import { AuditLog } from "../models/AuditLog.js";

const execFileAsync = promisify(execFile);
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const REQUIRED_DATASET_PATHS = [
  "MLPipeline/datasets/url_train.jsonl",
  "MLPipeline/datasets/email_train.jsonl",
  "MLPipeline/datasets/webpage_train.jsonl",
];
const REQUIRED_ARTIFACT_PATHS = [
  "MLPipeline/artifacts/url_logreg/latest.json",
  "MLPipeline/artifacts/email_tfidf_logreg/latest.json",
  "MLPipeline/artifacts/webpage_signals_rf/latest.json",
];

const runLocalRetrainWithBootstrap = async () => {
  const retrainScriptPath = resolve(repoRoot, "MLPipeline", "scripts", "retrain_all.py");
  const syntheticScriptPath = resolve(repoRoot, "MLPipeline", "scripts", "generate_synthetic_datasets.py");
  await access(retrainScriptPath);
  const pythonBin = process.platform === "win32" ? "python" : "python3";

  try {
    await execFileAsync(pythonBin, ["MLPipeline/scripts/retrain_all.py"], {
      cwd: repoRoot,
      timeout: 20 * 60 * 1000,
    });
    return { mode: "local-fallback", message: "Retraining completed locally" };
  } catch (firstError) {
    const combinedOutput = `${firstError?.stdout || ""}\n${firstError?.stderr || ""}\n${firstError?.message || ""}`;
    const missingDataset = /missing or empty datasets/i.test(combinedOutput);
    if (!missingDataset) throw firstError;

    // Self-heal local environments by generating baseline synthetic datasets, then retry once.
    await access(syntheticScriptPath);
    await execFileAsync(pythonBin, ["MLPipeline/scripts/generate_synthetic_datasets.py"], {
      cwd: repoRoot,
      timeout: 5 * 60 * 1000,
    });
    await execFileAsync(pythonBin, ["MLPipeline/scripts/retrain_all.py"], {
      cwd: repoRoot,
      timeout: 20 * 60 * 1000,
    });
    return { mode: "local-fallback", message: "Retraining completed locally after dataset bootstrap" };
  }
};

export const submitMlFeedbackController = async (req, res, next) => {
  try {
    const { incidentId, groundTruthStatus, notes = "" } = req.body;
    if (!mongoose.Types.ObjectId.isValid(incidentId)) {
      const err = new Error("incidentId must be a valid ObjectId");
      err.statusCode = 400;
      throw err;
    }

    const incident = await Incident.findById(incidentId);
    if (!incident) {
      const err = new Error("Incident not found");
      err.statusCode = 404;
      throw err;
    }

    const feedback = await createFeedback({ incident, groundTruthStatus, notes });

    return res.status(201).json({
      success: true,
      message: "ML feedback recorded",
      data: {
        id: feedback._id,
        incidentId: feedback.incidentId,
        predictedStatus: feedback.predictedStatus,
        groundTruthStatus: feedback.groundTruthStatus,
        isFalsePositive: feedback.isFalsePositive,
        isFalseNegative: feedback.isFalseNegative,
        createdAt: feedback.createdAt,
      },
    });
  } catch (error) {
    if (error?.code === 11000) {
      const err = new Error("Feedback already exists for this incident");
      err.statusCode = 409;
      return next(err);
    }
    return next(error);
  }
};

export const mlMetricsController = async (req, res, next) => {
  try {
    const days = req.query.days;
    const rows = await getLatestDailyMetrics(days);
    return res.status(200).json({
      success: true,
      message: "ML metrics fetched",
      data: { days: rows.length, rows },
    });
  } catch (error) {
    return next(error);
  }
};

export const mlReadinessController = async (_req, res, next) => {
  try {
    const allChecks = [...REQUIRED_DATASET_PATHS, ...REQUIRED_ARTIFACT_PATHS];
    const checks = await Promise.all(
      allChecks.map(async (relPath) => {
        const absPath = resolve(repoRoot, relPath);
        try {
          await access(absPath);
          return { path: relPath, ok: true };
        } catch {
          return { path: relPath, ok: false };
        }
      })
    );

    const missing = checks.filter((item) => !item.ok).map((item) => item.path);
    const ready = missing.length === 0;
    return res.status(200).json({
      success: true,
      message: ready ? "ML system is ready" : "ML system is not fully ready",
      data: {
        ready,
        datasets: checks.filter((item) => item.path.includes("/datasets/")),
        artifacts: checks.filter((item) => item.path.includes("/artifacts/")),
        missing,
      },
    });
  } catch (error) {
    return next(error);
  }
};

export const mlRetrainController = async (req, res, next) => {
  try {
    const exportStats = await exportFeedbackToIncrementalDatasets();
    const mlServiceBase = process.env.ML_SERVICE_URL || "http://127.0.0.1:8010";
    const retrainUrl = `${mlServiceBase.replace(/\/$/, "")}/retrain`;

    let payload;
    try {
      const response = await fetch(retrainUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
      });
      payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message || `ML service returned ${response.status}`);
      }
    } catch (remoteError) {
      // Fallback for local development where Python service may not expose /retrain.
      try {
        payload = await runLocalRetrainWithBootstrap();
      } catch {
        throw remoteError;
      }
    }
    payload = { ...payload, feedbackExport: exportStats };

    await AuditLog.create({
      userId: req.user.id,
      action: "ml:retrain",
      ip: req.ip,
      metadata: { result: payload?.message || "Retraining started/completed", feedbackExport: exportStats?.exported || {} },
    });

    return res.status(200).json({
      success: true,
      message: "ML retraining completed",
      data: payload,
    });
  } catch (error) {
    return next(error);
  }
};

