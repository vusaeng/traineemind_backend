// controllers/achievement.controller.js
import Achievement from "../models/Achievement.js";
import UserAchievement from "../models/UserAchievement.js";
import User from "../models/User.js";
import Profile from "../models/Profile.js";
import mongoose from "mongoose";

/**
 * Get all achievements (user)
 * GET /api/achievements
 */
export const getAllAchievements = async (req, res) => {
  try {
    const {
      category,
      type,
      difficulty,
      limit = 20,
      page = 1,
      sortBy = "displayOrder",
      order = "asc",
      includeHidden = false,
    } = req.query;

    const filter = { isActive: true };

    if (category) filter.category = category;
    if (type) filter.type = type;
    if (!includeHidden) filter.isHidden = false;

    if (difficulty) {
      filter.badgeLevel = difficulty;
    }

    const skip = (page - 1) * limit;
    const sort = { [sortBy]: order === "desc" ? -1 : 1 };

    const [achievements, total] = await Promise.all([
      Achievement.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .select("-progressFormula")
        .lean(),
      Achievement.countDocuments(filter),
    ]);

    // Add user progress if user is authenticated
    let userAchievements = {};
    if (req.user) {
      const userAchs = await UserAchievement.find({
        user: req.user._id,
      }).lean();

      userAchievements = userAchs.reduce((acc, ach) => {
        acc[ach.achievement.toString()] = ach;
        return acc;
      }, {});
    }

    // Merge user progress with achievements
    const achievementsWithProgress = achievements.map((ach) => ({
      ...ach,
      userProgress: userAchievements[ach._id.toString()] || {
        status: "locked",
        currentProgress: 0,
        progressPercentage: 0,
      },
    }));

    res.json({
      success: true,
      data: achievementsWithProgress,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("Error fetching achievements:", err);
    res.status(500).json({
      success: false,
      error: "Failed to fetch achievements",
      message: err.message,
    });
  }
};

/**
 * Get user's achievements
 * GET /api/achievements/user
 */
export const getUserAchievements = async (req, res) => {
  try {
    const userId = req.user._id;
    const { status, category } = req.query;

    const filter = { user: userId };
    if (status) filter.status = status;

    const userAchievements = await UserAchievement.find(filter)
      .populate({
        path: "achievement",
        match: category ? { category } : {},
        select:
          "name description icon iconUrl color type category points xpReward badgeLevel",
      })
      .sort({ unlockedAt: -1, "achievement.displayOrder": 1 })
      .lean();

    // Filter out achievements that don't match category (after populate)
    const filteredAchievements = userAchievements.filter(
      (ua) => ua.achievement,
    );

    // Calculate stats
    const stats = {
      total: filteredAchievements.length,
      unlocked: filteredAchievements.filter(
        (a) => a.status === "unlocked" || a.status === "claimed",
      ).length,
      claimed: filteredAchievements.filter((a) => a.status === "claimed")
        .length,
      totalPoints: filteredAchievements.reduce(
        (sum, a) => sum + (a.achievement.points || 0),
        0,
      ),
      totalXp: filteredAchievements.reduce(
        (sum, a) => sum + (a.achievement.xpReward || 0),
        0,
      ),
      byCategory: {},
      byType: {},
    };

    // Group by category and type
    filteredAchievements.forEach((ua) => {
      const { category, type } = ua.achievement;

      if (!stats.byCategory[category]) stats.byCategory[category] = 0;
      if (!stats.byType[type]) stats.byType[type] = 0;

      stats.byCategory[category]++;
      stats.byType[type]++;
    });

    res.json({
      success: true,
      data: {
        achievements: filteredAchievements,
        stats,
      },
    });
  } catch (err) {
    console.error("Error fetching user achievements:", err);
    res.status(500).json({
      success: false,
      error: "Failed to fetch user achievements",
      message: err.message,
    });
  }
};

/**
 * Claim an achievement
 * POST /api/achievements/:achievementId/claim
 */
export const claimAchievement = async (req, res) => {
  try {
    const { achievementId } = req.params;
    const userId = req.user._id;

    const userAchievement = await UserAchievement.findOne({
      user: userId,
      achievement: achievementId,
    }).populate("achievement");

    if (!userAchievement) {
      return res.status(404).json({
        success: false,
        error: "Achievement not found for user",
      });
    }

    if (userAchievement.status !== "unlocked") {
      return res.status(400).json({
        success: false,
        error: "Achievement must be unlocked before claiming",
      });
    }

    // Claim the achievement
    await userAchievement.claim();

    // Update user's XP and points in profile
    await Profile.findOneAndUpdate(
      { user: userId },
      {
        $inc: {
          "stats.points": userAchievement.achievement.points,
          "stats.xp": userAchievement.achievement.xpReward,
        },
      },
      { upsert: true },
    );

    // Update achievement stats
    await Achievement.findByIdAndUpdate(achievementId, {
      $inc: { "stats.totalEarned": 1 },
    });

    res.json({
      success: true,
      message: "Achievement claimed successfully!",
      data: {
        achievement: userAchievement.achievement,
        userAchievement,
        rewards: {
          points: userAchievement.achievement.points,
          xp: userAchievement.achievement.xpReward,
        },
      },
    });
  } catch (err) {
    console.error("Error claiming achievement:", err);
    res.status(500).json({
      success: false,
      error: "Failed to claim achievement",
      message: err.message,
    });
  }
};

/**
 * Check and update user achievements (called after user actions)
 * This should be called after significant user actions
 */
export const checkUserAchievements = async (userId, action, metadata = {}) => {
  try {
    const achievements = await Achievement.find({
      isActive: true,
      "requirement.metric": action.metric,
    });

    const updates = [];

    for (const achievement of achievements) {
      let progressIncrease = 0;

      // Calculate progress based on achievement type and action
      switch (achievement.requirement.metric) {
        case "tutorials_completed":
          progressIncrease = 1;
          break;
        case "total_learning_time":
          progressIncrease = metadata.minutes || 0;
          break;
        case "streak_days":
          progressIncrease = metadata.days || 0;
          break;
        case "comments_posted":
          progressIncrease = 1;
          break;
        // Add more cases as needed
        default:
          progressIncrease = 1;
      }

      // Find or create user achievement
      let userAchievement = await UserAchievement.findOne({
        user: userId,
        achievement: achievement._id,
      });

      if (!userAchievement) {
        userAchievement = new UserAchievement({
          user: userId,
          achievement: achievement._id,
          requiredProgress: achievement.requirement.threshold,
          currentProgress: 0,
          progressPercentage: 0,
          status: "locked",
          metadata: {
            tutorialId: metadata.tutorialId,
            categoryId: metadata.categoryId,
            lastPosition: metadata.lastPosition,
            score: metadata.score,
          },
        });
      }

      // Update progress
      if (
        userAchievement.status === "locked" ||
        userAchievement.status === "in_progress"
      ) {
        const newProgress = userAchievement.currentProgress + progressIncrease;
        await userAchievement.updateProgress(newProgress);

        if (userAchievement.status === "unlocked") {
          // Achievement unlocked!
          updates.push({
            achievementId: achievement._id,
            name: achievement.name,
            description: achievement.description,
            icon: achievement.icon,
            points: achievement.points,
            status: "unlocked",
          });
        }
      }
    }

    return updates;
  } catch (err) {
    console.error("Error checking achievements:", err);
    return [];
  }
};

/**
 * Get achievement leaderboard
 * GET /api/achievements/leaderboard
 */
export const getLeaderboard = async (req, res) => {
  try {
    const { timeframe = "all", limit = 20 } = req.query;

    let dateFilter = {};
    if (timeframe === "weekly") {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      dateFilter = { unlockedAt: { $gte: oneWeekAgo } };
    } else if (timeframe === "monthly") {
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      dateFilter = { unlockedAt: { $gte: oneMonthAgo } };
    }

    // Aggregate leaderboard data
    const leaderboard = await UserAchievement.aggregate([
      { $match: { status: { $in: ["unlocked", "claimed"] }, ...dateFilter } },
      {
        $group: {
          _id: "$user",
          totalPoints: { $sum: { $ifNull: ["$achievement.points", 0] } },
          totalAchievements: { $sum: 1 },
          lastAchievement: { $max: "$unlockedAt" },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $project: {
          _id: 1,
          name: "$user.name",
          avatar: "$user.avatar",
          totalPoints: 1,
          totalAchievements: 1,
          lastAchievement: 1,
        },
      },
      { $sort: { totalPoints: -1, totalAchievements: -1 } },
      { $limit: parseInt(limit) },
    ]);

    res.json({
      success: true,
      data: {
        leaderboard,
        timeframe,
      },
    });
  } catch (err) {
    console.error("Error fetching leaderboard:", err);
    res.status(500).json({
      success: false,
      error: "Failed to fetch leaderboard",
      message: err.message,
    });
  }
};

/**
 * Admin: Create achievement
 * POST /api/admin/achievements
 */
export const createAchievement = async (req, res) => {
  try {
    const achievement = new Achievement(req.body);
    await achievement.save();

    res.status(201).json({
      success: true,
      message: "Achievement created successfully",
      data: achievement,
    });
  } catch (err) {
    console.error("Error creating achievement:", err);
    res.status(500).json({
      success: false,
      error: "Failed to create achievement",
      message: err.message,
    });
  }
};

/**
 * Admin: Update achievement
 * PUT /api/admin/achievements/:id
 */
export const updateAchievement = async (req, res) => {
  try {
    const { id } = req.params;

    const achievement = await Achievement.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!achievement) {
      return res.status(404).json({
        success: false,
        error: "Achievement not found",
      });
    }

    res.json({
      success: true,
      message: "Achievement updated successfully",
      data: achievement,
    });
  } catch (err) {
    console.error("Error updating achievement:", err);
    res.status(500).json({
      success: false,
      error: "Failed to update achievement",
      message: err.message,
    });
  }
};

/**
 * Admin: Delete achievement
 * DELETE /api/admin/achievements/:id
 */
export const deleteAchievement = async (req, res) => {
  try {
    const { id } = req.params;

    // Soft delete by setting isActive to false
    const achievement = await Achievement.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true },
    );

    if (!achievement) {
      return res.status(404).json({
        success: false,
        error: "Achievement not found",
      });
    }

    res.json({
      success: true,
      message: "Achievement deactivated successfully",
    });
  } catch (err) {
    console.error("Error deleting achievement:", err);
    res.status(500).json({
      success: false,
      error: "Failed to delete achievement",
      message: err.message,
    });
  }
};
