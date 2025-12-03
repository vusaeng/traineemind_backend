// src/routes/admin.routes.js
import { Router } from "express";
import auth from "../middleware/auth.js";
import roles from "../middleware/roles.js";
import { uploadVideo, uploadImage } from "../middleware/upload.js";
import * as ContentController from "../controllers/content.controller.js";
import * as CategoriesController from "../controllers/categories.controller.js";
import * as UsersController from "../controllers/users.controller.js";
import * as AnalyticsController from "../controllers/analytics.controller.js";

const router = Router();

router.use(auth, roles("admin"));

router.post("/upload/video", uploadVideo.single("video"), (req, res) => {
  res.status(201).json({ filename: req.file.filename, url: `/uploads/videos/${req.file.filename}` });
});

router.post("/upload/image", uploadImage.single("image"), (req, res) => {
  res.status(201).json({ filename: req.file.filename, url: `/uploads/images/${req.file.filename}` });
});

router.post("/content", ContentController.create);
router.patch("/content/:id", ContentController.update);
router.delete("/content/:id", ContentController.remove);
router.post("/content/:id/publish", ContentController.publishToggle);

router.post("/categories", CategoriesController.create);
router.patch("/categories/:id", CategoriesController.update);
router.delete("/categories/:id", CategoriesController.remove);

router.get("/users", UsersController.list);
router.patch("/users/:id", UsersController.update);

router.get("/analytics/overview", AnalyticsController.overview);

export default router;
