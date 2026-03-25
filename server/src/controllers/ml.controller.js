import mongoose from "mongoose";
import { Incident } from "../models/Incident.js";
import { createFeedback, getLatestDailyMetrics } from "../services/mlMonitoring.service.js";

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

