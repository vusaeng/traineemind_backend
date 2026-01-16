import UserProgress from "../models/UserProgress.js";

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
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(201).json({ progress: doc });
  } catch (err) {
    next(err);
  }
}
