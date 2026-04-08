import mongoose from "mongoose";

const mlFeedbackSchema = new mongoose.Schema(
  {
    incidentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Incident",
      required: true,
    },
    incidentType: {
      type: String,
      enum: ["url", "email"],
      required: true,
      index: true,
    },
    predictedStatus: {
      type: String,
      enum: ["safe", "suspicious", "phishing"],
      required: true,
      index: true,
    },
    groundTruthStatus: {
      type: String,
      enum: ["safe", "suspicious", "phishing"],
      required: true,
      index: true,
    },
    isFalsePositive: {
      type: Boolean,
      required: true,
      index: true,
    },
    isFalseNegative: {
      type: Boolean,
      required: true,
      index: true,
    },
    notes: {
      type: String,
      default: "",
      trim: true,
      maxlength: 2000,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { versionKey: false }
);

mlFeedbackSchema.index({ incidentId: 1 }, { unique: true });

export const MLFeedback = mongoose.model("MLFeedback", mlFeedbackSchema);

