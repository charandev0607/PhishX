import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    refreshTokenHash: {
      type: String,
      required: true,
      select: false,
    },
    ip: {
      type: String,
      required: true,
      trim: true,
    },
    userAgent: {
      type: String,
      default: "unknown",
      trim: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    revokedAt: {
      type: Date,
      default: null,
      index: true,
    },
    lastUsedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true, versionKey: false }
);

sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

sessionSchema.methods.isActive = function isActive() {
  return !this.revokedAt && this.expiresAt > new Date();
};

export const Session = mongoose.model("Session", sessionSchema);
