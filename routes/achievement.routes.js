// routes/achievement.routes.js
import { Router } from "express";
import { body, param, query } from "express-validator";
import { validationHandler } from "../middleware/validate.js";
import * as AchievementController from "../controllers/achievement.controller.js";
// import { auth, isAdmin } from '../middleware/auth.js';
import auth from "../middleware/auth.js";

const router = Router();

// ========== PUBLIC ROUTES ==========

// Get all achievements
router.get(
  "/",
  [
    query("category")
      .optional()
      .isIn(["learning", "engagement", "mastery", "community", "special"])
      .withMessage("Invalid category"),
    query("type")
      .optional()
      .isIn([
        "progress",
        "streak",
        "completion",
        "speed",
        "explorer",
        "social",
        "milestone",
        "special",
      ])
      .withMessage("Invalid achievement type"),
    query("difficulty")
      .optional()
      .isIn(["bronze", "silver", "gold", "platinum", "diamond"])
      .withMessage("Invalid difficulty level"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Limit must be between 1-100"),
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Page must be a positive number"),
    validationHandler,
  ],
  AchievementController.getAllAchievements,
);

// Get achievement leaderboard
router.get(
  "/leaderboard",
  [
    query("timeframe")
      .optional()
      .isIn(["all", "weekly", "monthly"])
      .withMessage("Invalid timeframe"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Limit must be between 1-100"),
    validationHandler,
  ],
  AchievementController.getLeaderboard,
);

// ========== USER ROUTES (require authentication) ==========
router.use(auth);

// Get user's achievements
router.get(
  "/user",
  [
    query("status")
      .optional()
      .isIn(["locked", "in_progress", "unlocked", "claimed"])
      .withMessage("Invalid status"),
    query("category")
      .optional()
      .isIn(["learning", "engagement", "mastery", "community", "special"])
      .withMessage("Invalid category"),
    validationHandler,
  ],
  AchievementController.getUserAchievements,
);

// Claim an achievement
router.post(
  "/:achievementId/claim",
  [
    param("achievementId").isMongoId().withMessage("Invalid achievement ID"),
    validationHandler,
  ],
  AchievementController.claimAchievement,
);

export default router;
