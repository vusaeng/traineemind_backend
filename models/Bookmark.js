import mongoose from "mongoose";

const bookmarkSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    content: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Content",
      required: true,
      index: true
    }
  },
  { timestamps: true }
);

// Prevent duplicate bookmarks for the same user/content pair
bookmarkSchema.index({ user: 1, content: 1 }, { unique: true });

export default mongoose.model("Bookmark", bookmarkSchema);
