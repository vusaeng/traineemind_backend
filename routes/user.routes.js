// src/routes/user.routes.js

import { Router } from "express";
import * as UserController from "../controllers/user.controller.js";
import auth from "../middleware/auth.js";
import roles from "../middleware/roles.js";
import * as BookmarksController from "../controllers/bookmarks.controller.js";
import * as ProgressController from "../controllers/progress.controller.js";
import { validationHandler } from "../middleware/validate.js";
import { body, param } from "express-validator";

const router = Router();

router.use(auth);

// Bookmarks
router.get("/bookmarks", BookmarksController.list);
router.post(
  "/bookmarks",
  body("contentId").isMongoId(),
  validationHandler,
  BookmarksController.add,
);
router.delete(
  "/bookmarks/:contentId",
  param("contentId").isMongoId(),
  validationHandler,
  BookmarksController.remove,
);

// Progress
router.get("/progress", ProgressController.list);
router.post(
  "/progress",
  body("contentId").isMongoId(),
  body("status").isIn(["not_started", "in_progress", "completed"]),
  body("lastPositionSec").optional().isInt({ min: 0 }),
  validationHandler,
  ProgressController.upsert,
);

export default router;
