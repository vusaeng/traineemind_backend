// routes/tutorial.routes.js
import express from "express";
import * as PublicTutorialController from "../controllers/tutorial.controller.public.js";

const router = express.Router();

// Public Routes
router.get("/", PublicTutorialController.list);
router.get("/:slug", PublicTutorialController.detail);
router.post("/:slug/view", PublicTutorialController.incrementViewCount);

// Handle 404 for other routes

router.use((req, res) => {
  res.status(404).json({ error: "Not Found" });
});

export default router;
