import UserProgress from "../models/UserProgress.js";
import User from "../models/User.js";
import Profile from "../models/Profile.js";

export const getUserProgress = async (req, res) => {
  try {
    const userId = req.user._id;

    // Get user's progress from UserProgress model or from Content
    const progress = await UserProgress.find({ userId })
      .select("tutorialId progress updatedAt")
      .lean();

    // Convert to object for easy lookup
    const progressMap = {};
    progress.forEach((p) => {
      progressMap[p.tutorialId] = p.progress;
    });

    res.json({ progress: progressMap });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch progress" });
  }
};

export const updateProgress = async (req, res) => {
  try {
    const { tutorialId } = req.params;
    const { progress } = req.body;
    const userId = req.user._id;

    await UserProgress.findOneAndUpdate(
      { userId, tutorialId },
      { progress, updatedAt: new Date() },
      { upsert: true, new: true },
    );

    res.json({ success: true, progress });
  } catch (error) {
    res.status(500).json({ error: "Failed to update progress" });
  }
};

// User tutorials controller functions
export const listUserTutorials = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId).populate("tutorials").lean();

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ tutorials: user.tutorials });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch user tutorials" });
  }
};

export const completeTutorial = async (req, res) => {
  try {
    const userId = req.user._id;
    const { tutorialId } = req.params;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    if (!user.tutorials.includes(tutorialId)) {
      user.tutorials.push(tutorialId);
      await user.save();
    }
    res.json({ success: true, message: "Tutorial marked as complete" });
  } catch (error) {
    res.status(500).json({ error: "Failed to complete tutorial" });
  }
};
