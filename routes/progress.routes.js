// routes/progress.routes.js
import { Router } from "express";
import * as ProgressRoutes from "../controllers/progress.controller.js";
import mongoose from "mongoose";
import UserProgress from "../models/UserProgress.js";
import auth from "../middleware/auth.js";

const router = Router();

// All routes require authentication
router.use(auth);

router.get("/", ProgressRoutes.getUserProgress);

router.get("/debug/user-progress", async (req, res) => {
  try {
    const userId = req.user._id;
    const userProgress = await UserProgress.find({ userId });

    console.log("All UserProgress documents for user:", userId);
    userProgress.forEach((doc) => {
      console.log(`Tutorial: ${doc.tutorialId}, Progress: ${doc.progress}`);
    });

    res.json({ userProgress });
  } catch (error) {
    console.error("Debug error:", error);
    res.status(500).json({ error: "Debug failed" });
  }
});

router.get("/test-aggregation", async (req, res) => {
  try {
    const userId = req.user._id;

    const stats = await UserProgress.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: null,
          tutorialsCompleted: {
            $sum: { $cond: [{ $eq: ["$progress", 100] }, 1, 0] },
          },
          tutorialsInProgress: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gt: ["$progress", 0] },
                    { $lt: ["$progress", 100] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          totalProgressRecords: { $sum: 1 },
          allProgressValues: { $push: "$progress" },
        },
      },
    ]);

    console.log("Aggregation result:", stats);
    res.json({ stats });
  } catch (error) {
    console.error("Aggregation test error:", error);
    res.status(500).json({ error: "Test failed" });
  }
});

router.get("/debug/user-progress-direct", async (req, res) => {
  try {
    const userId = req.user._id;
    console.log("User ID from request:", userId);
    console.log("User ID type:", typeof userId);

    // Try as string
    const docsAsString = await UserProgress.find({ userId: userId });
    console.log("Found with string match:", docsAsString.length);

    // Try as ObjectId
    const objectId = new mongoose.Types.ObjectId(userId);
    const docsAsObjectId = await UserProgress.find({ userId: objectId });
    console.log("Found with ObjectId match:", docsAsObjectId.length);

    res.json({
      userId,
      docsAsString: docsAsString.map((d) => ({
        id: d._id,
        progress: d.progress,
        tutorialId: d.tutorialId,
      })),
      docsAsObjectId: docsAsObjectId.map((d) => ({
        id: d._id,
        progress: d.progress,
        tutorialId: d.tutorialId,
      })),
    });
  } catch (error) {
    console.error("Debug error:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/debug/request-info", async (req, res) => {
  const userId = req.user._id;
  console.log("=== Request Debug Info ===");
  console.log("req.user:", req.user);
  console.log("req.userId:", userId);
  console.log("req.headers.authorization:", req.headers.authorization);
  console.log("req.headers:", req.headers);

  res.json({
    user: req.user,
    userId: req.userId,
    hasAuthHeader: !!req.headers.authorization,
    authHeader: req.headers.authorization,
  });
});

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
