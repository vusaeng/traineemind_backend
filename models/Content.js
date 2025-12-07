import mongoose from "mongoose";

const contentSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["video", "article", "project", "blog"],
      required: true,
    },
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    body: { type: String },
    categories: [{ type: mongoose.Schema.Types.ObjectId, ref: "Category" }],
    video: {
      url: String,
      durationSec: Number,
      thumbnailUrl: String,
      transcript: String,
      provider: { type: String, enum: ["youtube", "vimeo", "selfhosted"] },
      quality: [String], // e.g. ["720p", "1080p"]
    },
    metrics: {
      views: { type: Number, default: 0 },
    },
    isPublished: { type: Boolean, default: false },
    publishedAt: Date,
  },
  { timestamps: true }
);

contentSchema.index({ title: "text", body: "text" });

export default mongoose.model("Content", contentSchema);
