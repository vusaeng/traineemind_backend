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
    transcript: { type: String },
    image: {
      url: String,
      altText: String,
    },
    learningObjectives: [String],
    prerequisites: [String],
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    excerpt: { type: String },
    tags: [String],
    categories: [{ type: mongoose.Schema.Types.ObjectId, ref: "Category" }],
    isFeatured: { type: Boolean, default: false },
    comments: [
      {
        name: String,
        email: String,
        content: String,
        status: {
          type: String,
          enum: ["pending", "approved", "rejected"],
          default: "pending",
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
        updatedAt: Date,
        moderatedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        moderationNotes: String,
        context: {
          type: {
            type: String,
            enum: ["general", "question", "code_help", "feedback"],
            default: "general",
          },
        },
        timestamp: Number, // For video tutorials - timestamp in seconds
        replies: [
          {
            name: String,
            email: String,
            content: String,
            createdAt: {
              type: Date,
              default: Date.now,
            },
          },
        ],
      },
    ],
    video: {
      url: String,
      durationSec: Number,
      thumbnailUrl: String,
      transcript: String,
      provider: {
        type: String,
        enum: ["youtube", "vimeo", "selfhosted", "external"],
        default: "youtube",
      },
      quality: [String], // e.g. ["720p", "1080p"]
    },
    metrics: {
      views: { type: Number, default: 0 },
      rating: { type: Number, default: 0 },
      ratingsCount: { type: Number, default: 0 },
    },
    isPublished: { type: Boolean, default: false },
    publishedAt: Date,
  },
  { timestamps: true }
);

contentSchema.index({ title: "text", body: "text" });

export default mongoose.model("Content", contentSchema);
