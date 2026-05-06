import mongoose from "mongoose";

const mlDailyMetricsSchema = new mongoose.Schema(
  {
    date: {
      type: String, // YYYY-MM-DD (UTC)
      required: true,
      unique: true,
      index: true,
    },
    feedbackCount: { type: Number, default: 0 },
    falsePositives: { type: Number, default: 0 },
    falseNegatives: { type: Number, default: 0 },
    truePositives: { type: Number, default: 0 },
    trueNegatives: { type: Number, default: 0 },
    byType: {
      url: {
        feedbackCount: { type: Number, default: 0 },
        falsePositives: { type: Number, default: 0 },
        falseNegatives: { type: Number, default: 0 },
      },
      email: {
        feedbackCount: { type: Number, default: 0 },
        falsePositives: { type: Number, default: 0 },
        falseNegatives: { type: Number, default: 0 },
      },
      webpage: {
        feedbackCount: { type: Number, default: 0 },
        falsePositives: { type: Number, default: 0 },
        falseNegatives: { type: Number, default: 0 },
      },
    },
    updatedAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

export const MLDailyMetrics = mongoose.model("MLDailyMetrics", mlDailyMetricsSchema);

