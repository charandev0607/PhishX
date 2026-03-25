import mongoose from "mongoose";

const policySchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: "default",
      unique: true,
      index: true,
    },
    autoBlockThreshold: {
      type: Number,
      min: 0,
      max: 100,
      default: 70,
    },
    autoQuarantine: {
      type: Boolean,
      default: true,
    },
    requireMfaForAdmins: {
      type: Boolean,
      default: true,
    },
    notifyOnCritical: {
      type: Boolean,
      default: true,
    },
    maxAlertsPerMinute: {
      type: Number,
      min: 1,
      max: 1000,
      default: 100,
    },
  },
  { timestamps: true, versionKey: false }
);

export const Policy = mongoose.model("Policy", policySchema);
