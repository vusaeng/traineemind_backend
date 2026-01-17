// models/Achievement.js
import mongoose from "mongoose";

const AchievementSchema = new mongoose.Schema(
  {
    // Basic Information
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },

    // Visual Representation
    icon: {
      type: String,
      default: "🏆",
    },
    iconType: {
      type: String,
      enum: ["emoji", "image", "svg"],
      default: "emoji",
    },
    iconUrl: String,
    color: {
      type: String,
      default: "#FFD700", // Gold
    },

    // Achievement Type & Category
    type: {
      type: String,
      enum: [
        "progress", // Based on learning progress
        "streak", // Based on learning streak
        "completion", // Based on tutorial completion
        "speed", // Based on fast completion
        "explorer", // Based on variety of tutorials
        "social", // Based on social interactions
        "milestone", // Based on major milestones
        "special", // Special/seasonal achievements
      ],
      required: true,
    },
    category: {
      type: String,
      enum: ["learning", "engagement", "mastery", "community", "special"],
      default: "learning",
    },

    // Requirements
    requirement: {
      metric: {
        type: String,
        enum: [
          "tutorials_completed",
          "total_learning_time",
          "streak_days",
          "points_earned",
          "categories_explored",
          "comments_posted",
          "tutorials_bookmarked",
          "perfect_scores",
          "certificates_earned",
        ],
        required: true,
      },
      threshold: {
        type: Number,
        required: true,
        min: 1,
      },
      unit: {
        type: String,
        enum: ["count", "minutes", "days", "points", "percentage"],
        default: "count",
      },
    },

    // Scoring & Rewards
    points: {
      type: Number,
      default: 100,
      min: 0,
    },
    xpReward: {
      type: Number,
      default: 100,
      min: 0,
    },
    badgeLevel: {
      type: String,
      enum: ["bronze", "silver", "gold", "platinum", "diamond"],
      default: "bronze",
    },

    // Unlock Conditions
    isHidden: {
      type: Boolean,
      default: false,
    },
    isSecret: {
      type: Boolean,
      default: false,
    },
    prerequisites: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Achievement",
      },
    ],

    // Progress Tracking
    progressFormula: String, // Optional: JavaScript formula for progress calculation

    // Metadata
    displayOrder: {
      type: Number,
      default: 0,
    },
    tags: [String],
    version: {
      type: String,
      default: "1.0",
    },

    // Time-based Achievements
    isTimeLimited: {
      type: Boolean,
      default: false,
    },
    startDate: Date,
    endDate: Date,
    isRecurring: {
      type: Boolean,
      default: false,
    },
    recurrence: {
      type: String,
      enum: ["daily", "weekly", "monthly", "yearly"],
    },

    // Status
    isActive: {
      type: Boolean,
      default: true,
    },

    // Statistics
    stats: {
      totalEarned: {
        type: Number,
        default: 0,
      },
      lastEarned: Date,
      averageTimeToEarn: Number, // in days
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Virtual for progress percentage (for users)
AchievementSchema.virtual("progress").get(function () {
  // This would be populated from user data
  return 0;
});

// Indexes for performance
AchievementSchema.index({ type: 1, category: 1 });
AchievementSchema.index({ "requirement.metric": 1 });
AchievementSchema.index({ points: -1 });
AchievementSchema.index({ isActive: 1, isHidden: 1 });
AchievementSchema.index({ tags: 1 });

// Pre-save hook to update stats
AchievementSchema.pre("save", function (next) {
  if (this.isModified("stats.totalEarned")) {
    this.stats.lastEarned = new Date();
  }
  next();
});

export default mongoose.model("Achievement", AchievementSchema);
