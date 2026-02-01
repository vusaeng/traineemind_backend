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
      lastPosition: 0,
      notes: [],
      bookmarks: [],
    });

    await userProgress.save();

    // 4. Optional: Update tutorial metrics (if you track this)
    /*     if (tutorial.metrics) {
      tutorial.metrics.startedCount = (tutorial.metrics.startedCount || 0) + 1;
      await tutorial.save();
    } */

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

// Get progress for all tutorials for the user
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
    const { progress, lastPosition } = req.body;
    const updateData = {};

    if (progress !== undefined) updateData.progress = progress;
    if (lastPosition !== undefined) updateData.lastPosition = lastPosition;
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
// In your addNote controller function
export const addNote = async (req, res) => {
  try {
    const userId = req.user._id;
    const { tutorialId } = req.params;
    const { content, timestamp } = req.body; // Changed from 'note' to 'content'

    console.log("Adding note with data:", { content, timestamp }); // Debug log

    const progress = await UserProgress.findOne({ userId, tutorialId });
    if (!progress) {
      return res.status(404).json({
        success: false,
        error: "Progress not found",
      });
    }

    // Create the note object with ALL fields
    const newNote = {
      content: content, // This was probably 'note' before
      timestamp: timestamp || 0,
      createdAt: new Date(),
    };

    // console.log("Note to add:", newNote); // Debug log

    progress.notes.push(newNote);
    await progress.save();

    // Get the newly added note (with its generated _id)
    const addedNote = progress.notes[progress.notes.length - 1];

    // console.log("Added note:", addedNote); // Debug log

    res.json({
      success: true,
      message: "Note added successfully",
      data: addedNote, // Return the complete note
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

// Get all notes across tutorials for the user
export const getAllNotes = async (req, res) => {
  try {
    const userId = req.user._id;

    const progressWithNotes = await UserProgress.find({
      userId,
      "notes.0": { $exists: true }, // Only include documents with notes
    })
      .populate("tutorialId", "title slug") // Get tutorial info
      .select("tutorialId notes");

    // Format the response
    const allNotes = progressWithNotes.flatMap((progress) =>
      progress.notes.map((note) => ({
        ...note.toObject(),
        tutorialId: progress.tutorialId._id,
        tutorialTitle: progress.tutorialId.title,
        tutorialSlug: progress.tutorialId.slug,
        progressId: progress._id,
      })),
    );

    // Sort by creation date (newest first)
    allNotes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      success: true,
      data: {
        notes: allNotes,
        totalNotes: allNotes.length,
        tutorialsWithNotes: progressWithNotes.length,
      },
    });
  } catch (error) {
    console.error("Error fetching all notes:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch notes",
    });
  }
};

// Get paginated notes across tutorials for the user
export const getNotesPaginated = async (req, res) => {
  try {
    const userId = req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Aggregation to get paginated notes
    const result = await UserProgress.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      { $unwind: "$notes" },
      { $sort: { "notes.createdAt": -1 } },
      {
        $lookup: {
          from: "contents",
          localField: "tutorialId",
          foreignField: "_id",
          as: "tutorial",
        },
      },
      { $unwind: "$tutorial" },
      {
        $project: {
          _id: "$notes._id",
          content: "$notes.content",
          timestamp: "$notes.timestamp",
          createdAt: "$notes.createdAt",
          tutorialId: "$tutorialId",
          tutorialTitle: "$tutorial.title",
          tutorialSlug: "$tutorial.slug",
          progressId: "$_id",
        },
      },
      {
        $facet: {
          metadata: [{ $count: "totalNotes" }],
          data: [{ $skip: skip }, { $limit: limit }],
        },
      },
    ]);

    const notes = result[0].data;
    const totalNotes = result[0].metadata[0]?.totalNotes || 0;

    res.json({
      success: true,
      data: {
        notes,
        pagination: {
          page,
          limit,
          totalNotes,
          pages: Math.ceil(totalNotes / limit),
          hasNext: page * limit < totalNotes,
          hasPrev: page > 1,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching paginated notes:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch notes",
    });
  }
};

// Get notes with search/filters

export const searchNotes = async (req, res) => {
  try {
    const userId = req.user._id;
    const { query, tutorialId, dateFrom, dateTo } = req.query;

    let matchStage = { userId: new mongoose.Types.ObjectId(userId) };

    // Add filters
    if (tutorialId) {
      matchStage.tutorialId = new mongoose.Types.ObjectId(tutorialId);
    }

    const aggregation = [{ $match: matchStage }, { $unwind: "$notes" }];

    // Date range filter
    if (dateFrom || dateTo) {
      const dateFilter = {};
      if (dateFrom) dateFilter.$gte = new Date(dateFrom);
      if (dateTo) dateFilter.$lte = new Date(dateTo);
      aggregation.push({ $match: { "notes.createdAt": dateFilter } });
    }

    // Text search
    if (query) {
      aggregation.push({
        $match: {
          "notes.content": { $regex: query, $options: "i" },
        },
      });
    }

    aggregation.push(
      {
        $lookup: {
          from: "contents",
          localField: "tutorialId",
          foreignField: "_id",
          as: "tutorial",
        },
      },
      { $unwind: "$tutorial" },
      {
        $project: {
          _id: "$notes._id",
          content: "$notes.content",
          timestamp: "$notes.timestamp",
          createdAt: "$notes.createdAt",
          tutorialId: "$tutorialId",
          tutorialTitle: "$tutorial.title",
          tutorialSlug: "$tutorial.slug",
        },
      },
      { $sort: { createdAt: -1 } },
    );

    const notes = await UserProgress.aggregate(aggregation);

    res.json({
      success: true,
      data: {
        notes,
        total: notes.length,
      },
    });
  } catch (error) {
    console.error("Error searching notes:", error);
    res.status(500).json({
      success: false,
      error: "Failed to search notes",
    });
  }
};
