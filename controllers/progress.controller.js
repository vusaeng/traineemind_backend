import UserProgress from "../models/UserProgress.js";
import Content from "../models/Content.js"; // Assuming Content is your Tutorial model
import User from "../models/User.js";
import mongoose from "mongoose";

export const startTutorial = async (req, res) => {
  try {
    const userId = req.user._id;
    const { tutorialId } = req.params;

    // Validate tutorialId
    if (!mongoose.Types.ObjectId.isValid(tutorialId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid tutorial ID",
      });
    }

    // 1. Check if tutorial exists
    const tutorial = await Content.findById(tutorialId);
    if (!tutorial) {
      return res.status(404).json({
        success: false,
        error: "Tutorial not found",
      });
    }

    // 2. Check if user already has progress for this tutorial
    let userProgress = await UserProgress.findOne({
      userId,
      tutorialId,
    });

    if (userProgress) {
      // Tutorial already in progress - update lastViewedAt
      userProgress.lastViewedAt = new Date();
      await userProgress.save();

      return res.json({
        success: true,
        message: "Tutorial already in progress",
        data: {
          progress: userProgress,
          isNew: false,
        },
      });
    }

    // 3. Create new progress record
    userProgress = new UserProgress({
      userId,
      tutorialId,
      progress: 0, // Starting at 0%
      lastViewedAt: new Date(),
      timeSpent: 0,
      notes: [],
      bookmarks: [],
    });

    await userProgress.save();

    // 4. Optional: Update tutorial metrics (if you track this)
    if (tutorial.metrics) {
      tutorial.metrics.startedCount = (tutorial.metrics.startedCount || 0) + 1;
      await tutorial.save();
    }

    res.status(201).json({
      success: true,
      message: "Tutorial started successfully",
      data: {
        progress: userProgress,
        isNew: true,
      },
    });
  } catch (error) {
    console.error("Error starting tutorial:", error);
    res.status(500).json({
      success: false,
      error: "Failed to start tutorial",
    });
  }
};

export const getProgress = async (req, res) => {
  try {
    const userId = req.user._id;
    const { tutorialId } = req.params;

    const progress = await UserProgress.findOne({
      userId,
      tutorialId,
    });

    if (!progress) {
      return res.status(404).json({
        success: false,
        error: "Progress not found",
      });
    }

    res.json({
      success: true,
      data: { progress },
    });
  } catch (error) {
    console.error("Error fetching progress:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch progress",
    });
  }
};

// Add to progress.controller.js
export const getUserProgress = async (req, res) => {
  try {
    const userId = req.user._id;

    const progress = await UserProgress.find({ userId })
      .populate("tutorialId", "title slug featuredImage difficulty categories")
      .sort({ updatedAt: -1 });

    res.json({
      success: true,
      data: progress,
    });
  } catch (error) {
    console.error("Error fetching user progress:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch progress",
    });
  }
};

// Update progress (for when user is watching)
export const updateProgress = async (req, res) => {
  try {
    const userId = req.user._id;
    const { tutorialId } = req.params;
    const { progress, timeSpent } = req.body;
    const updateData = {};

    if (progress !== undefined) updateData.progress = progress;
    if (timeSpent !== undefined) updateData.timeSpent = timeSpent;
    updateData.lastViewedAt = new Date();
    const updatedProgress = await UserProgress.findOneAndUpdate(
      { userId, tutorialId },
      { $set: updateData },
      { new: true },
    );
    if (!updatedProgress) {
      return res.status(404).json({
        success: false,
        error: "Progress not found",
      });
    }
    res.json({
      success: true,
      message: "Progress updated successfully",
      data: { progress: updatedProgress },
    });
  } catch (error) {
    console.error("Error updating progress:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update progress",
    });
  }
};

// Mark as complete
export const completeTutorial = async (req, res) => {
  try {
    const userId = req.user._id;
    const { tutorialId } = req.params;
    const completedAt = new Date();

    const updatedProgress = await UserProgress.findOneAndUpdate(
      { userId, tutorialId },
      {
        $set: { progress: 100, completedAt, lastViewedAt: completedAt },
      },
      { new: true },
    );
    if (!updatedProgress) {
      return res.status(404).json({
        success: false,
        error: "Progress not found",
      });
    }
    res.json({
      success: true,
      message: "Tutorial marked as complete",
      data: { progress: updatedProgress },
    });
  } catch (error) {
    console.error("Error completing tutorial:", error);
    res.status(500).json({
      success: false,
      error: "Failed to complete tutorial",
    });
  }
};

/**
 * List all progress records for the current user
 * GET /api/user/progress
 */
export async function list(req, res, next) {
  try {
    const progress = await UserProgress.find({ user: req.user.id })
      .populate("content", "title slug type")
      .lean();

    res.json({ progress });
  } catch (err) {
    next(err);
  }
}

/**
 * Upsert progress for a specific content item
 * POST /api/user/progress
 */
export async function upsert(req, res, next) {
  try {
    const { contentId, status, lastPositionSec, checkpoints } = req.body;

    const doc = await UserProgress.findOneAndUpdate(
      { user: req.user.id, content: contentId },
      { status, lastPositionSec, checkpoints },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    res.status(201).json({ progress: doc });
  } catch (err) {
    next(err);
  }
}

// Progress notes
export const addNote = async (req, res) => {
  try {
    const userId = req.user._id;
    const { tutorialId } = req.params;
    const { note, timestamp } = req.body;

    const progress = await UserProgress.findOne({ userId, tutorialId });
    if (!progress) {
      return res.status(404).json({
        success: false,
        error: "Progress not found",
      });
    }

    progress.notes.push({
      content: note,
      timestamp: timestamp || 0,
      createdAt: new Date(),
    });

    await progress.save();

    res.json({
      success: true,
      message: "Note added successfully",
      data: {
        note: progress.notes[progress.notes.length - 1],
        totalNotes: progress.notes.length,
      },
    });
  } catch (error) {
    console.error("Error adding note:", error);
    res.status(500).json({
      success: false,
      error: "Failed to add note",
    });
  }
};

// Update a note
export const updateNote = async (req, res) => {
  try {
    const userId = req.user._id;
    const { tutorialId, noteId } = req.params;
    const { content } = req.body;

    const progress = await UserProgress.findOne({ userId, tutorialId });
    if (!progress) {
      return res.status(404).json({
        success: false,
        error: "Progress not found",
      });
    }

    const noteIndex = progress.notes.findIndex(
      (note) => note._id.toString() === noteId,
    );
    if (noteIndex === -1) {
      return res.status(404).json({
        success: false,
        error: "Note not found",
      });
    }

    progress.notes[noteIndex].content = content;
    progress.notes[noteIndex].updatedAt = new Date();

    await progress.save();

    res.json({
      success: true,
      message: "Note updated successfully",
      data: { note: progress.notes[noteIndex] },
    });
  } catch (error) {
    console.error("Error updating note:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update note",
    });
  }
};

// Delete a note
export const removeNote = async (req, res) => {
  try {
    const userId = req.user._id;
    const { tutorialId, noteId } = req.params;

    const progress = await UserProgress.findOne({ userId, tutorialId });
    if (!progress) {
      return res.status(404).json({
        success: false,
        error: "Progress not found",
      });
    }

    const initialLength = progress.notes.length;
    progress.notes = progress.notes.filter(
      (note) => note._id.toString() !== noteId,
    );

    if (progress.notes.length === initialLength) {
      return res.status(404).json({
        success: false,
        error: "Note not found",
      });
    }

    await progress.save();

    res.json({
      success: true,
      message: "Note deleted successfully",
      data: { totalNotes: progress.notes.length },
    });
  } catch (error) {
    console.error("Error deleting note:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete note",
    });
  }
};

// Get note by ID
export const getNoteById = async (req, res) => {
  try {
    const userId = req.user._id;
    const { tutorialId, noteId } = req.params;

    const progress = await UserProgress.findOne({
      userId,
      tutorialId,
      "notes._id": noteId,
    });

    if (!progress) {
      return res.status(404).json({
        success: false,
        error: "Note not found",
      });
    }

    const note = progress.notes.find((n) => n._id.toString() === noteId);

    res.json({
      success: true,
      data: { note },
    });
  } catch (error) {
    console.error("Error fetching note:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch note",
    });
  }
};

export const getNotes = async (req, res) => {
  try {
    const userId = req.user._id;
    const { tutorialId } = req.params;
    const progress = await UserProgress.findOne({ userId, tutorialId });
    if (!progress) {
      return res.status(404).json({
        success: false,
        error: "Progress not found",
      });
    }
    res.json({
      success: true,
      data: { notes: progress.notes },
    });
  } catch (error) {
    console.error("Error fetching notes:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch notes",
    });
  }
};
