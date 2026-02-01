// controllers/profile.controller.js
import User from "../models/User.js";
import Profile from "../models/Profile.js";
import Content from "../models/Content.js";
import Bookmark from "../models/Bookmark.js";
import mongoose from "mongoose";

/**
 * Get current user's profile
 * GET /api/users/profile
 */
export const getProfile = async (req, res) => {
  try {
    console.log("getProfile called");
    console.log("Request user:", req.user);

    const userId = req.user._id;
    console.log("User ID from request:", userId);

    if (!userId) {
      console.log("No user ID in request");
      return res.status(401).json({
        success: false,
        error: "Not authenticated",
      });
    }

    // Fetch user and profile in parallel
    const [user, profile] = await Promise.all([
      User.findById(userId).select(
        "-password -resetPasswordToken -resetPasswordExpires",
      ),
      Profile.findOne({ user: userId }),
    ]);

    console.log("User found:", user ? "Yes" : "No");
    console.log("Profile found:", profile ? "Yes" : "No");

    if (!user) {
      console.log("User not found in database for ID:", userId);
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    // If no profile exists, create a default one
    let userProfile = profile;
    if (!userProfile) {
      userProfile = await Profile.create({
        user: userId,
        stats: {
          totalLearningTime: 0,
          tutorialsCompleted: 0,
          tutorialsInProgress: 0,
          streak: { current: 0, longest: 0, lastActive: null },
          points: 0,
          level: 1,
          achievements: [],
        },
      });
    }

    // Calculate learning stats from UserProgress if needed
    if (userProfile.stats.tutorialsCompleted === 0) {
      await updateUserStats(userId);
      userProfile = await Profile.findOne({ user: userId });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          verified: user.verified,
          createdAt: user.createdAt,
        },
        profile: userProfile,
      },
    });
  } catch (err) {
    console.error("Error fetching profile:", err);
    res.status(500).json({
      success: false,
      error: "Failed to fetch profile",
      message: err.message,
    });
  }
};

/**
 * Update user profile
 * PUT /api/users/profile
 */
export const updateProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const updates = req.body;

    // Fields that can be updated in User model
    const allowedUserFields = ["name"];
    // Fields that can be updated in Profile model
    const allowedProfileFields = [
      "avatar",
      "bio",
      "location",
      "website",
      "company",
      "jobTitle",
      "phone",
    ];

    // Fields that require special handling
    const allowedSocialFields = [
      "twitter",
      "linkedin",
      "github",
      "youtube",
      "instagram",
      "facebook",
    ];
    const allowedPreferenceFields = [
      "emailNotifications",
      "marketingEmails",
      "newsletter",
      "theme",
      "language",
    ];
    const allowedLearningPreferenceFields = [
      "difficultyLevel",
      "categories",
      "dailyLearningGoal",
      "notificationTime",
    ];

    // Separate updates by model
    const userUpdates = {};
    const profileUpdates = {};

    // Process user updates
    allowedUserFields.forEach((field) => {
      if (updates[field] !== undefined) {
        userUpdates[field] = updates[field];
      }
    });

    // Process basic profile updates
    allowedProfileFields.forEach((field) => {
      if (updates[field] !== undefined) {
        profileUpdates[field] = updates[field];
      }
    });

    // Process social links
    if (updates.social && typeof updates.social === "object") {
      profileUpdates.social = {};
      allowedSocialFields.forEach((field) => {
        if (updates.social[field] !== undefined) {
          profileUpdates.social[field] = updates.social[field];
        }
      });
    }

    // Process preferences
    if (updates.preferences && typeof updates.preferences === "object") {
      profileUpdates.preferences = profileUpdates.preferences || {};
      allowedPreferenceFields.forEach((field) => {
        if (updates.preferences[field] !== undefined) {
          profileUpdates.preferences[field] = updates.preferences[field];
        }
      });
    }

    // Process learning preferences
    if (
      updates.learningPreferences &&
      typeof updates.learningPreferences === "object"
    ) {
      profileUpdates.learningPreferences =
        profileUpdates.learningPreferences || {};
      allowedLearningPreferenceFields.forEach((field) => {
        if (updates.learningPreferences[field] !== undefined) {
          // Special handling for categories array
          if (
            field === "categories" &&
            Array.isArray(updates.learningPreferences[field])
          ) {
            // Validate category IDs
            const validCategories = updates.learningPreferences[field].filter(
              (id) => mongoose.Types.ObjectId.isValid(id),
            );
            profileUpdates.learningPreferences.categories = validCategories;
          } else {
            profileUpdates.learningPreferences[field] =
              updates.learningPreferences[field];
          }
        }
      });
    }

    // Update timestamps
    profileUpdates.lastUpdated = new Date();

    // Update User model if needed
    if (Object.keys(userUpdates).length > 0) {
      await User.findByIdAndUpdate(userId, userUpdates, { new: true });
    }

    // Update or create Profile
    let profile = await Profile.findOneAndUpdate(
      { user: userId },
      { $set: profileUpdates },
      {
        new: true,
        runValidators: true,
        upsert: true, // Create if doesn't exist
        setDefaultsOnInsert: true,
      },
    ).populate("learningPreferences.categories", "name slug");

    // Get updated user
    const user = await User.findById(userId).select(
      "-password -resetPasswordToken",
    );

    res.json({
      success: true,
      message: "Profile updated successfully",
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        profile,
      },
    });
  } catch (err) {
    console.error("Error updating profile:", err);

    // Handle validation errors
    if (err.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: Object.values(err.errors).map((e) => ({
          field: e.path,
          message: e.message,
        })),
      });
    }

    res.status(500).json({
      success: false,
      error: "Failed to update profile",
      message: err.message,
    });
  }
};

/**
 * Upload profile avatar
 * POST /api/users/profile/upload-avatar
 */
export const uploadAvatar = async (req, res) => {
  try {
    const userId = req.user._id;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No file uploaded",
      });
    }

    // Create avatar URL
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;

    // Update profile with new avatar
    const profile = await Profile.findOneAndUpdate(
      { user: userId },
      {
        $set: { avatar: avatarUrl, lastUpdated: new Date() },
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      },
    );

    res.json({
      success: true,
      message: "Avatar uploaded successfully",
      data: {
        avatarUrl,
        profile,
      },
    });
  } catch (err) {
    console.error("Error uploading avatar:", err);
    res.status(500).json({
      success: false,
      error: "Failed to upload avatar",
      message: err.message,
    });
  }
};

/**
 * Update social links only
 * PUT /api/users/profile/social
 */
export const updateSocialLinks = async (req, res) => {
  try {
    const userId = req.user._id;
    const { twitter, linkedin, github, youtube, instagram, facebook } =
      req.body;

    const socialUpdates = {};
    if (twitter !== undefined) socialUpdates.twitter = twitter;
    if (linkedin !== undefined) socialUpdates.linkedin = linkedin;
    if (github !== undefined) socialUpdates.github = github;
    if (youtube !== undefined) socialUpdates.youtube = youtube;
    if (instagram !== undefined) socialUpdates.instagram = instagram;
    if (facebook !== undefined) socialUpdates.facebook = facebook;

    const profile = await Profile.findOneAndUpdate(
      { user: userId },
      {
        $set: {
          social: socialUpdates,
          lastUpdated: new Date(),
        },
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      },
    );

    res.json({
      success: true,
      message: "Social links updated successfully",
      data: { profile },
    });
  } catch (err) {
    console.error("Error updating social links:", err);
    res.status(500).json({
      success: false,
      error: "Failed to update social links",
      message: err.message,
    });
  }
};

/**
 * Update preferences only
 * PUT /api/users/profile/preferences
 */
export const updatePreferences = async (req, res) => {
  try {
    const userId = req.user._id;
    const { emailNotifications, marketingEmails, newsletter, theme, language } =
      req.body;

    const preferenceUpdates = {};
    if (emailNotifications !== undefined)
      preferenceUpdates.emailNotifications = emailNotifications;
    if (marketingEmails !== undefined)
      preferenceUpdates.marketingEmails = marketingEmails;
    if (newsletter !== undefined) preferenceUpdates.newsletter = newsletter;
    if (theme !== undefined) preferenceUpdates.theme = theme;
    if (language !== undefined) preferenceUpdates.language = language;

    const profile = await Profile.findOneAndUpdate(
      { user: userId },
      {
        $set: {
          preferences: preferenceUpdates,
          lastUpdated: new Date(),
        },
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      },
    );

    res.json({
      success: true,
      message: "Preferences updated successfully",
      data: { profile },
    });
  } catch (err) {
    console.error("Error updating preferences:", err);
    res.status(500).json({
      success: false,
      error: "Failed to update preferences",
      message: err.message,
    });
  }
};

/**
 * Update learning preferences only
 * PUT /api/users/profile/learning-preferences
 */
export const updateLearningPreferences = async (req, res) => {
  try {
    const userId = req.user._id;
    const { difficultyLevel, categories, dailyLearningGoal, notificationTime } =
      req.body;

    const learningPreferenceUpdates = {};
    if (difficultyLevel !== undefined)
      learningPreferenceUpdates.difficultyLevel = difficultyLevel;
    if (categories !== undefined) {
      // Validate category IDs
      const validCategories = categories.filter((id) =>
        mongoose.Types.ObjectId.isValid(id),
      );
      learningPreferenceUpdates.categories = validCategories;
    }
    if (dailyLearningGoal !== undefined)
      learningPreferenceUpdates.dailyLearningGoal = dailyLearningGoal;
    if (notificationTime !== undefined)
      learningPreferenceUpdates.notificationTime = notificationTime;

    const profile = await Profile.findOneAndUpdate(
      { user: userId },
      {
        $set: {
          learningPreferences: learningPreferenceUpdates,
          lastUpdated: new Date(),
        },
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      },
    ).populate("learningPreferences.categories", "name slug");

    res.json({
      success: true,
      message: "Learning preferences updated successfully",
      data: { profile },
    });
  } catch (err) {
    console.error("Error updating learning preferences:", err);
    res.status(500).json({
      success: false,
      error: "Failed to update learning preferences",
      message: err.message,
    });
  }
};

/**
 * Update user stats (called internally or by cron job)
 */
export const updateUserStats = async (userId) => {
  try {
    const UserProgress = (await import("../models/UserProgress.js")).default;

    // Get progress stats
    const progressStats = await UserProgress.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
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

    // Get streak info
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const recentActivity = await UserProgress.find({
      userId: new mongoose.Types.ObjectId(userId),
      updatedAt: { $gte: yesterday },
    }).sort({ updatedAt: -1 });

    // Calculate streak
    let currentStreak = 0;
    let longestStreak = 0;

    if (recentActivity.length > 0) {
      // Simple streak logic - in production you'd want more sophisticated logic
      currentStreak = 1; // Temporary
      longestStreak = 1; // Temporary
    }

    // Update profile stats
    const statsUpdate = {
      "stats.totalLearningTime": progressStats[0]?.totalLearningTime || 0,
      "stats.tutorialsCompleted": progressStats[0]?.tutorialsCompleted || 0,
      "stats.tutorialsInProgress": progressStats[0]?.tutorialsInProgress || 0,
      "stats.streak.current": currentStreak,
      "stats.streak.longest": longestStreak,
      "stats.streak.lastActive": recentActivity[0]?.updatedAt || null,
      "stats.points": (progressStats[0]?.tutorialsCompleted || 0) * 100,
      "stats.level":
        Math.floor(((progressStats[0]?.tutorialsCompleted || 0) * 100) / 500) +
        1,
    };

    await Profile.findOneAndUpdate(
      { user: userId },
      { $set: statsUpdate },
      { upsert: true },
    );

    return statsUpdate;
  } catch (err) {
    console.error("Error updating user stats:", err);
    throw err;
  }
};

/**
 * Get user stats (public endpoint)
 * GET /api/users/:userId/stats
 */
export const getUserStats = async (req, res) => {
  try {
    const userId = req.user._id;

    const profile = await Profile.findOne({ user: userId })
      .select("stats avatar bio")
      .populate("stats.achievements.achievementId", "name icon");

    if (!profile) {
      return res.status(404).json({
        success: false,
        error: "User profile not found",
      });
    }

    // Get user info
    const user = await User.findById(userId).select("name role");

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          role: user.role,
        },
        stats: profile.stats,
        avatar: profile.avatar,
        bio: profile.bio,
      },
    });
  } catch (err) {
    console.error("Error fetching user stats:", err);
    res.status(500).json({
      success: false,
      error: "Failed to fetch user stats",
      message: err.message,
    });
  }
};

// Get profile bookmarks
export const getProfileBookmarks = async (req, res) => {
  try {
    const userId = req.user._id;

    const bookmarks = await Bookmark.find({ user: userId })
      .populate("content", "title slug type")
      .lean();
    res.json({ bookmarks });
  } catch (err) {
    console.error("Error fetching bookmarks:", err);
    res.status(500).json({
      success: false,
      error: "Failed to fetch bookmarks",
      message: err.message,
    });
  }
};
