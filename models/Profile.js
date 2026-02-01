// models/Profile.js
import mongoose from "mongoose";

const ProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    // Personal Information
    avatar: {
      type: String,
      default: "",
    },
    bio: {
      type: String,
      maxlength: 500,
      default: "",
    },
    location: String,
    website: String,
    company: String,
    jobTitle: String,

    // Contact Information
    phone: String,

    // Social Links
    social: {
      twitter: String,
      linkedin: String,
      github: String,
      youtube: String,
      instagram: String,
      facebook: String,
    },

    // Preferences
    preferences: {
      emailNotifications: {
        type: Boolean,
        default: true,
      },
      marketingEmails: {
        type: Boolean,
        default: false,
      },
      newsletter: {
        type: Boolean,
        default: false,
      },
      theme: {
        type: String,
        enum: ["light", "dark", "auto"],
        default: "auto",
      },
      language: {
        type: String,
        default: "en",
      },
    },

    // Learning Preferences
    learningPreferences: {
      difficultyLevel: {
        type: String,
        enum: ["beginner", "intermediate", "advanced", "all"],
        default: "all",
      },
      categories: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Category",
        },
      ],
      dailyLearningGoal: {
        type: Number, // in minutes
        default: 30,
      },
      notificationTime: {
        type: String, // HH:MM format
        default: "09:00",
      },
    },

    // Statistics (updated periodically)
    stats: {
      totalLearningTime: {
        // in minutes
        type: Number,
        default: 0,
      },
      tutorialsCompleted: {
        type: Number,
        default: 0,
      },
      tutorialsInProgress: {
        type: Number,
        default: 0,
      },
      streak: {
        current: {
          type: Number,
          default: 0,
        },
        longest: {
          type: Number,
          default: 0,
        },
        lastActive: Date,
      },
      points: {
        type: Number,
        default: 0,
      },
      level: {
        type: Number,
        default: 1,
      },
      achievements: [
        {
          achievementId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Achievement",
          },
          earnedAt: Date,
        },
      ],
    },

    // Metadata
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes
ProfileSchema.index({ user: 1 });
ProfileSchema.index({ "stats.level": 1 });
ProfileSchema.index({ "stats.points": -1 });

// Virtual for full name
ProfileSchema.virtual("fullName").get(function () {
  const user = this.populated("user") || this._user;
  return user ? user.name : "";
});

// Method to update stats
ProfileSchema.methods.updateStats = async function () {
  const UserProgress = mongoose.model("UserProgress");

  console.log("=== updateStats called for user:", this.user);

  const stats = await UserProgress.aggregate([
    { $match: { userId: this.user } },
    {
      $group: {
        _id: null,
        tutorialsCompleted: {
          $sum: { $cond: [{ $eq: ["$progress", 100] }, 1, 0] },
        },
        tutorialsInProgress: {
          $sum: {
            $cond: [
              {
                $and: [{ $gt: ["$progress", 0] }, { $lt: ["$progress", 100] }],
              },
              1,
              0,
            ],
          },
        },
        totalLearningTime: { $sum: "$lastPosition" },
        // Add debugging fields
        totalDocuments: { $sum: 1 },
        progressValues: {
          $push: { progress: "$progress", tutorialId: "$tutorialId" },
        },
      },
    },
  ]);

  console.log("Aggregation result:", stats);

  if (stats.length > 0) {
    console.log("Progress values found:", stats[0].progressValues);
    console.log(
      "Calculated - Completed:",
      stats[0].tutorialsCompleted,
      "In Progress:",
      stats[0].tutorialsInProgress,
    );

    this.stats.tutorialsCompleted = stats[0].tutorialsCompleted;
    this.stats.tutorialsInProgress = stats[0].tutorialsInProgress;
    this.stats.totalLearningTime = Math.floor(stats[0].totalLearningTime / 60);
    await this.save();

    console.log("Updated profile stats:", this.stats);
  }

  return this;
};

export default mongoose.model("Profile", ProfileSchema);
