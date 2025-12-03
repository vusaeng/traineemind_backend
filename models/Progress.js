import mongoose from "mongoose";

const progressSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    content: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Content",
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: ["not_started", "in_progress", "completed"],
      default: "not_started"
    },
    lastPositionSec: {
      type: Number,
      default: 0
    }, // for video tutorials
    checkpoints: [
      {
        label: String,
        timestampSec: Number
      }
    ]
  },
  { timestamps: true }
);

// Ensure one progress record per user/content pair
progressSchema.index({ user: 1, content: 1 }, { unique: true });

export default mongoose.model("Progress", progressSchema);
