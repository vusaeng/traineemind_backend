// routes/profile.routes.js
import { Router } from "express";
import { body, param } from "express-validator";
import { validationHandler } from "../middleware/validate.js";
import * as ProfileController from "../controllers/profile.controller.js";
import auth from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";
import Profile from "../models/Profile.js";

const router = Router();

// All routes require authentication
router.use(auth);

// ========== PROFILE ROUTES ==========

// Get current user profile
router.get("/", ProfileController.getProfile);

// Update profile (general update)
router.put(
  "/",
  [
    body("name")
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage("Name must be between 2-50 characters"),
    body("avatar").optional().isURL().withMessage("Avatar must be a valid URL"),
    body("bio")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Bio must be less than 500 characters"),
    body("location")
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage("Location must be less than 100 characters"),
    body("website")
      .optional()
      .trim()
      .isURL()
      .withMessage("Website must be a valid URL"),
    body("company")
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage("Company must be less than 100 characters"),
    body("jobTitle")
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage("Job title must be less than 100 characters"),
    body("phone")
      .optional()
      .trim()
      .matches(/^[\+]?[1-9][\d]{0,15}$/)
      .withMessage("Phone must be a valid number"),
    validationHandler,
  ],
  ProfileController.updateProfile,
);

// Upload profile picture
router.post(
  "/upload-avatar",
  upload.single("avatar"),
  ProfileController.uploadAvatar,
);

// Update social links
router.put(
  "/social",
  [
    body("twitter")
      .optional()
      .trim()
      .isURL()
      .withMessage("Twitter must be a valid URL"),
    body("linkedin")
      .optional()
      .trim()
      .isURL()
      .withMessage("LinkedIn must be a valid URL"),
    body("github")
      .optional()
      .trim()
      .isURL()
      .withMessage("GitHub must be a valid URL"),
    body("youtube")
      .optional()
      .trim()
      .isURL()
      .withMessage("YouTube must be a valid URL"),
    body("instagram")
      .optional()
      .trim()
      .isURL()
      .withMessage("Instagram must be a valid URL"),
    body("facebook")
      .optional()
      .trim()
      .isURL()
      .withMessage("Facebook must be a valid URL"),
    validationHandler,
  ],
  ProfileController.updateSocialLinks,
);

// Update preferences
router.put(
  "/preferences",
  [
    body("emailNotifications")
      .optional()
      .isBoolean()
      .withMessage("emailNotifications must be a boolean"),
    body("marketingEmails")
      .optional()
      .isBoolean()
      .withMessage("marketingEmails must be a boolean"),
    body("newsletter")
      .optional()
      .isBoolean()
      .withMessage("newsletter must be a boolean"),
    body("theme")
      .optional()
      .isIn(["light", "dark", "auto"])
      .withMessage("Theme must be light, dark, or auto"),
    body("language")
      .optional()
      .isLength({ min: 2, max: 5 })
      .withMessage("Language must be 2-5 characters"),
    validationHandler,
  ],
  ProfileController.updatePreferences,
);

// Update learning preferences
router.put(
  "/learning-preferences",
  [
    body("difficultyLevel")
      .optional()
      .isIn(["beginner", "intermediate", "advanced", "all"])
      .withMessage("Invalid difficulty level"),
    body("categories")
      .optional()
      .isArray()
      .withMessage("Categories must be an array"),
    body("categories.*")
      .optional()
      .isMongoId()
      .withMessage("Each category must be a valid ID"),
    body("dailyLearningGoal")
      .optional()
      .isInt({ min: 5, max: 480 })
      .withMessage("Daily goal must be between 5-480 minutes"),
    body("notificationTime")
      .optional()
      .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
      .withMessage("Time must be in HH:MM format"),
    validationHandler,
  ],
  ProfileController.updateLearningPreferences,
);

// Profile bookmarks
router.get("/bookmarks", ProfileController.getProfileBookmarks);

// Get user stats
router.get("/stats", ProfileController.getUserStats);

export default router;
