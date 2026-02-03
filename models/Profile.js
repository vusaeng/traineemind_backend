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

  console.log("=== updateStats called ===");
  console.log("this.user value:", this.user);
  console.log("this.user type:", typeof this.user);

  // Check if it's already an ObjectId
  console.log("Is ObjectId?", mongoose.Types.ObjectId.isValid(this.user));

  // Convert to ObjectId - FIXED VERSION
  let userId;
  if (this.user && mongoose.Types.ObjectId.isValid(this.user)) {
    userId = new mongoose.Types.ObjectId(this.user);
  } else if (this.user && this.user._id) {
    userId = new mongoose.Types.ObjectId(this.user._id);
  } else {
    console.error("Invalid user ID:", this.user);
    return this; // Return without updating
  }

  console.log("User ID for aggregation:", userId);

  try {
    const stats = await UserProgress.aggregate([
      {
        $match: {
          userId: userId,
        },
      },
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
                  $and: [
                    { $gt: ["$progress", 0] },
                    { $lt: ["$progress", 100] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          totalLearningTime: { $sum: "$lastPosition" },
        },
      },
    ]);

    console.log("Aggregation result:", stats);

    if (stats.length > 0) {
      console.log("Setting stats:", {
        completed: stats[0].tutorialsCompleted,
        inProgress: stats[0].tutorialsInProgress,
        totalTime: stats[0].totalLearningTime,
      });

      this.stats.tutorialsCompleted = stats[0].tutorialsCompleted;
      this.stats.tutorialsInProgress = stats[0].tutorialsInProgress;
      this.stats.totalLearningTime = (
        stats[0].totalLearningTime / 3600
      ).toFixed(2); // convert to hours
    } else {
      console.log("No stats found - resetting to 0");
      this.stats.tutorialsCompleted = 0;
      this.stats.tutorialsInProgress = 0;
      this.stats.totalLearningTime = 0;
    }

    // Save the profile
    const savedProfile = await this.save();
    console.log("Saved profile stats:", savedProfile.stats);

    return savedProfile;
  } catch (error) {
    console.error("Error in updateStats:", error);
    throw error;
  }
};

export default mongoose.model("Profile", ProfileSchema);
