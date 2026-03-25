import mongoose from "mongoose";

const incidentSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      default: "url",
      index: true,
    },
    input: {
      type: String,
      required: true,
      trim: true,
    },
    score: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      index: true,
    },
    status: {
      type: String,
      enum: ["safe", "suspicious", "phishing"],
      required: true,
      index: true,
    },
    reasons: {
      type: [String],
      default: [],
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { versionKey: false }
);

export const Incident = mongoose.model("Incident", incidentSchema);
