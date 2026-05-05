import mongoose from "mongoose";

const reportedLinkSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending_review", "reviewed"],
      default: "pending_review",
      index: true,
    },
  },
  { timestamps: true, versionKey: false }
);

export const ReportedLink = mongoose.model("ReportedLink", reportedLinkSchema);
