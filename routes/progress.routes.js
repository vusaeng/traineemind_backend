// routes/progress.routes.js
import { Router } from "express";
import * as ProgressRoutes from "../controllers/progress.controller.js";
import auth from "../middleware/auth.js";

const router = Router();

// All routes require authentication
router.use(auth);

router.get("/", ProgressRoutes.getUserProgress);

// Start a tutorial
router.post("/:tutorialId/start", ProgressRoutes.startTutorial);

// Get progress for a tutorial
router.get("/:tutorialId", ProgressRoutes.getProgress);

// Update progress (for when user is watching)
router.put("/:tutorialId", ProgressRoutes.updateProgress);

// Mark as complete
router.post("/:tutorialId/complete", ProgressRoutes.completeTutorial);

// Notes
router.post("/:tutorialId/notes", ProgressRoutes.addNote);
router.get("/:tutorialId/notes", ProgressRoutes.getNotes);
router.put("/:tutorialId/notes/:noteId", ProgressRoutes.updateNote);
router.delete("/:tutorialId/notes/:noteId", ProgressRoutes.removeNote);

export default router;
