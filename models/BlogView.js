import mongoose from "mongoose";

const blogViewSchema = new mongoose.Schema(
  {
    blog: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Content",
      required: true,
    },
    ipAddress: {
      type: String,
      required: true,
    },
    userAgent: String,
    viewedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
blogViewSchema.index({ blog: 1, ipAddress: 1, viewedAt: -1 });
blogViewSchema.index({ viewedAt: 1 });

export default mongoose.model("BlogView", blogViewSchema);
