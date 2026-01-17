// src/routes/admin.routes.js
import { Router } from "express";
import auth from "../middleware/auth.js";
import roles from "../middleware/roles.js";
import { upload } from "../middleware/upload.js";
import * as ContentController from "../controllers/content.controller.js";
import * as CategoriesController from "../controllers/categories.controller.js";
import * as UsersController from "../controllers/admin.controller.js";
import * as AnalyticsController from "../controllers/analytics.controller.js";
import * as TutorialController from "../controllers/tutorial.controller.js";
import * as BlogController from "../controllers/blog.controller.js";
import * as CommentController from "../controllers/comment.controller.js";
import * as AchievementController from "../controllers/achievement.controller.js";
import { body, param } from "express-validator";
import { validationHandler } from "../middleware/validate.js";

const router = Router();

router.use(auth, roles("admin"));

// Uploads
router.post("/upload/video", upload.single("video"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No video uploaded" });
  res.status(201).json({
    filename: req.file.filename,
    url: `/uploads/videos/${req.file.filename}`,
  });
});

router.post("/upload/image", upload.single("image"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No image uploaded" });
  res.status(201).json({
    filename: req.file.filename,
    url: `/uploads/images/${req.file.filename}`,
  });
});

// Content
router.get("/content", ContentController.list);
router.get("/tutorials", TutorialController.list);
router.get("/blogs", BlogController.list);
router.get("/content/:idOrSlug", ContentController.detail);
router.get("/tutorials/:slug", TutorialController.detail);
router.get("/blogs/:slug", BlogController.detail);
router.post("/content", ContentController.create);
router.post(
  "/tutorials",
  upload.fields([
    { name: "video", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 },
  ]),
  TutorialController.createTutorial,
);
router.post("/blogs", BlogController.createBlog);
router.patch("/tutorials/:slug", TutorialController.updateTutorial);
router.patch("/blogs/:slug", BlogController.updateBlog);
router.delete("/tutorials/:slug", TutorialController.deleteTutorial);
router.patch("/content/:id", ContentController.update);
router.delete("/content/:id", ContentController.remove);
router.patch("/content/:id/publish", ContentController.publishToggle);

// Comments

router.get("/comments/stats", CommentController.getCommentStats);
router.get("/comments", CommentController.getComments);
router.put("/comments/:commentId/moderate", CommentController.moderateComment);
router.post("/comments/bulk-moderate", CommentController.bulkModerateComments);
router.delete("/comments/:commentId", CommentController.deleteComment);

// Categories
router.get("/categories", CategoriesController.list);
router.post("/categories", CategoriesController.create);
router.patch("/categories/:id", CategoriesController.update);
router.delete("/categories/:id", CategoriesController.remove);

// User statistics routes
router.get("/users/stats", UsersController.getUserStats); // Overall stats (if you still want it)
router.get("/users/:id/stats", UsersController.getUserIndividualStats); // Individual user stats

// Users
router.get("/users", UsersController.list);
router.get("/users/:id", UsersController.detail);
router.post("/users", UsersController.create);
router.patch("/users/:id", UsersController.update);
router.post("/users/:id/reset-password", UsersController.adminResetPassword);
router.post("/users/:id/send-reset-link", UsersController.adminSendResetLink);
router.get("/users/:id/reset-link-status", UsersController.getResetLinkStatus);
router.patch("/users/:id/status", UsersController.toggleActive);
router.patch("/users/:id/role", UsersController.toggleRole);
router.delete("/users/:id", UsersController.remove);

// Achievements

// Create achievement
router.post(
  "/",
  [
    body("name")
      .trim()
      .notEmpty()
      .withMessage("Name is required")
      .isLength({ min: 3, max: 100 })
      .withMessage("Name must be 3-100 characters"),
    body("description")
      .trim()
      .notEmpty()
      .withMessage("Description is required")
      .isLength({ min: 10, max: 500 })
      .withMessage("Description must be 10-500 characters"),
    body("type")
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
    body("category")
      .isIn(["learning", "engagement", "mastery", "community", "special"])
      .withMessage("Invalid category"),
    body("requirement.metric")
      .notEmpty()
      .withMessage("Requirement metric is required")
      .isIn([
        "tutorials_completed",
        "total_learning_time",
        "streak_days",
        "points_earned",
        "categories_explored",
        "comments_posted",
        "tutorials_bookmarked",
        "perfect_scores",
        "certificates_earned",
      ])
      .withMessage("Invalid requirement metric"),
    body("requirement.threshold")
      .isInt({ min: 1 })
      .withMessage("Threshold must be at least 1"),
    body("points")
      .optional()
      .isInt({ min: 0 })
      .withMessage("Points must be a positive number"),
    body("xpReward")
      .optional()
      .isInt({ min: 0 })
      .withMessage("XP reward must be a positive number"),
    body("badgeLevel")
      .optional()
      .isIn(["bronze", "silver", "gold", "platinum", "diamond"])
      .withMessage("Invalid badge level"),
    validationHandler,
  ],
  AchievementController.createAchievement,
);

// Update achievement
router.put(
  "/:id",
  [
    param("id").isMongoId().withMessage("Invalid achievement ID"),
    body("name")
      .optional()
      .trim()
      .isLength({ min: 3, max: 100 })
      .withMessage("Name must be 3-100 characters"),
    body("description")
      .optional()
      .trim()
      .isLength({ min: 10, max: 500 })
      .withMessage("Description must be 10-500 characters"),
    body("type")
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
    body("isActive")
      .optional()
      .isBoolean()
      .withMessage("isActive must be a boolean"),
    validationHandler,
  ],
  AchievementController.updateAchievement,
);

// Delete achievement
router.delete(
  "/:id",
  [
    param("id").isMongoId().withMessage("Invalid achievement ID"),
    validationHandler,
  ],
  AchievementController.deleteAchievement,
);

// Analytics
router.get("/analytics/overview", AnalyticsController.overview);

export default router;
