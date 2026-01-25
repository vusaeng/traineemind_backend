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

// // Note management
router.get("/:tutorialId/notes", ProgressRoutes.getNotes);
router.post("/:tutorialId/notes", ProgressRoutes.addNote);
router.put("/:tutorialId/notes/:noteId", ProgressRoutes.updateNote);
router.delete("/:tutorialId/notes/:noteId", ProgressRoutes.removeNote);
router.get("/:tutorialId/notes/:noteId", ProgressRoutes.getNoteById);

// All notes (across all tutorials)
router.get("/notes/all", ProgressRoutes.getAllNotes);
router.get("/notes", ProgressRoutes.getNotesPaginated);
router.get("/notes/search", ProgressRoutes.searchNotes);

export default router;
