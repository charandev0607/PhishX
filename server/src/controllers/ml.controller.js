import mongoose from "mongoose";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { Incident } from "../models/Incident.js";
import { createFeedback, getLatestDailyMetrics } from "../services/mlMonitoring.service.js";
import { AuditLog } from "../models/AuditLog.js";

const execFileAsync = promisify(execFile);

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
    const days = Number(req.query.days ?? 14);
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

export const mlRetrainController = async (req, res, next) => {
  try {
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
      await execFileAsync("python", ["MLPipeline/scripts/retrain_all.py"], { cwd: process.cwd(), timeout: 20 * 60 * 1000 });
      payload = { mode: "local-fallback", message: "Retraining completed locally" };
    }

    await AuditLog.create({
      userId: req.user.id,
      action: "ml:retrain",
      ip: req.ip,
      metadata: { result: payload?.message || "Retraining started/completed" },
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

