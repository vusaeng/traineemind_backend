// routes/tutorial.routes.js
import express from "express";
import { upload } from "../middleware/upload.js";
import { createTutorial } from "../controllers/tutorial.controller.js";
import auth from "../middleware/auth.js";
import roles from "../middleware/roles.js";
import Content from "../models/Content.js";
import Category from "../models/Category.js";
import { buildPagination } from "../utils/pagination.js";
import * as TutorialController from "../controllers/tutorial.controller.js";

const router = express.Router();

// POST /admin/tutorials
router.post(
  "/tutorials",
  auth,
  roles("admin"),
  upload.fields([
    { name: "video", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 },
  ]),
  createTutorial
);

router.get("/tutorials/:slug", TutorialController.detail);

router.get("/tutorials", TutorialController.list);

// Handle 404 for other routes

router.use((req, res) => {
  res.status(404).json({ error: "Not Found" });
});

export default router;
