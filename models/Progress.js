// models/UserProgress.js
import mongoose from 'mongoose';

const UserProgressSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  tutorialId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Content',
    required: true,
    index: true
  },
  progress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  lastViewedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: Date,
  timeSpent: {
    type: Number, // in seconds
    default: 0
  },
  notes: [{
    content: String,
    timestamp: Number, // video timestamp in seconds
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  bookmarks: [{
    timestamp: Number,
    note: String,
    createdAt: Date
  }]
}, {
  timestamps: true
});

// Compound index for efficient queries
UserProgressSchema.index({ userId: 1, tutorialId: 1 }, { unique: true });
UserProgressSchema.index({ userId: 1, progress: 1 });
UserProgressSchema.index({ userId: 1, completedAt: 1 });

export default mongoose.model('UserProgress', UserProgressSchema);