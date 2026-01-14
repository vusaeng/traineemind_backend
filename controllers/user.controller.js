import UserProgress from '../models/UserProgress.js';


export const getProfile = async (req, res) => {
  try {
    const user = req.user;
    res.json({ user });
  }
    catch (error) {
    res.status(500).json({ error: "Failed to fetch profile" });
  }
};


export const getUserProgress = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Get user's progress from UserProgress model or from Content
    const progress = await UserProgress.find({ userId })
      .select('tutorialId progress updatedAt')
      .lean();
    
    // Convert to object for easy lookup
    const progressMap = {};
    progress.forEach(p => {
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
      { upsert: true, new: true }
    );
    
    res.json({ success: true, progress });
  } catch (error) {
    res.status(500).json({ error: "Failed to update progress" });
  }
};