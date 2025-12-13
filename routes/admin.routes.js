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
  TutorialController.createTutorial
);
router.post("/blogs", BlogController.createBlog);
router.patch("/tutorials/:slug", TutorialController.updateTutorial);
router.patch("/blogs/:slug", BlogController.updateBlog);
router.delete("/tutorials/:slug", TutorialController.deleteTutorial);
router.patch("/content/:id", ContentController.update);
router.delete("/content/:id", ContentController.remove);
router.patch("/content/:id/publish", ContentController.publishToggle);

// Categories
router.get("/categories", CategoriesController.list);
router.post("/categories", CategoriesController.create);
router.patch("/categories/:id", CategoriesController.update);
router.delete("/categories/:id", CategoriesController.remove);

router.get("/users/stats", UsersController.getUserStats);
// Users
router.get("/users", UsersController.list);
router.get("/users/:id", UsersController.detail);
router.post("/users", UsersController.create);
router.patch("/users/:id", UsersController.update);
router.patch("/users/:id/status", UsersController.toggleActive);
router.patch("/users/:id/role", UsersController.toggleRole);
router.delete("/users/:id", UsersController.remove);

// Analytics
router.get("/analytics/overview", AnalyticsController.overview);

export default router;
