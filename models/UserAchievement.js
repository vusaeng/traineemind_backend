// models/UserAchievement.js
import mongoose from "mongoose";

const UserAchievementSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    achievement: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Achievement",
      required: true,
      index: true,
    },

    // Progress tracking for progressive achievements
    currentProgress: {
      type: Number,
      default: 0,
      min: 0,
    },
    requiredProgress: {
      type: Number,
      default: 1,
    },
    progressPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    // Status
    status: {
      type: String,
      enum: ["locked", "in_progress", "unlocked", "claimed"],
      default: "locked",
    },

    // Dates
    unlockedAt: Date,
    claimedAt: Date,

    // Progress updates
    lastProgressUpdate: Date,

    // Metadata
    unlockSource: {
      type: String,
      enum: ["automatic", "manual", "admin", "system"],
    },
    metadata: {
      tutorialId: mongoose.Schema.Types.ObjectId,
      categoryId: mongoose.Schema.Types.ObjectId,
      lastPosition: Number, // in minutes
      score: Number,
    },

    // Notifications
    notificationSent: {
      type: Boolean,
      default: false,
    },
    notificationSentAt: Date,
  },
  {
    timestamps: true,
  },
);

// Compound indexes
UserAchievementSchema.index({ user: 1, achievement: 1 }, { unique: true });
UserAchievementSchema.index({ user: 1, status: 1 });
UserAchievementSchema.index({ user: 1, unlockedAt: -1 });
UserAchievementSchema.index({ achievement: 1, unlockedAt: -1 });

// Virtual for isUnlocked
UserAchievementSchema.virtual("isUnlocked").get(function () {
  return this.status === "unlocked" || this.status === "claimed";
});

// Method to update progress
UserAchievementSchema.methods.updateProgress = function (newProgress) {
  this.currentProgress = newProgress;
  this.progressPercentage = Math.min(
    100,
    Math.floor((newProgress / this.requiredProgress) * 100),
  );
  this.lastProgressUpdate = new Date();

  if (
    this.currentProgress >= this.requiredProgress &&
    this.status !== "unlocked" &&
    this.status !== "claimed"
  ) {
    this.status = "unlocked";
    this.unlockedAt = new Date();
  }

  return this.save();
};

// Method to claim achievement
UserAchievementSchema.methods.claim = function () {
  if (this.status === "unlocked") {
    this.status = "claimed";
    this.claimedAt = new Date();
    return this.save();
  }
  throw new Error("Achievement must be unlocked before claiming");
};

export default mongoose.model("UserAchievement", UserAchievementSchema);
