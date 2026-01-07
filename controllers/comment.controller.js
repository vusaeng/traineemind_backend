import Content from "../models/Content.js";

// GET /api/admin/comments/stats
export const getCommentStats = async (req, res) => {
  try {
    // Calculate stats from all blogs
    const blogs = await Content.find({ type: "blog" });

    let total = 0;
    let pending = 0;
    let approved = 0;
    let rejected = 0;
    let recent = 0;

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    blogs.forEach((blog) => {
      const blogComments = blog.comments || [];
      total += blogComments.length;

      blogComments.forEach((comment) => {
        if (comment.status === "pending") pending++;
        if (comment.status === "approved") approved++;
        if (comment.status === "rejected") rejected++;

        if (new Date(comment.createdAt) >= sevenDaysAgo) {
          recent++;
        }
      });
    });

    res.json({
      total,
      pending,
      approved,
      rejected,
      recent,
    });
  } catch (error) {
    console.error("Error getting comment stats:", error);
    res.status(500).json({ error: "Failed to get comment statistics" });
  }
};

// GET /api/admin/comments
export const getComments = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    const skip = (page - 1) * limit;

    // Build match query
    const matchQuery = { type: "blog" };
    if (status && status !== "all") {
      matchQuery["comments.status"] = status;
    }

    // Aggregate to get comments with blog info
    const pipeline = [
      { $match: matchQuery },
      { $unwind: "$comments" },
      {
        $match: {
          ...(status && status !== "all" ? { "comments.status": status } : {}),
          ...(search
            ? {
                $or: [
                  { "comments.name": { $regex: search, $options: "i" } },
                  { "comments.email": { $regex: search, $options: "i" } },
                  { "comments.content": { $regex: search, $options: "i" } },
                  { title: { $regex: search, $options: "i" } },
                ],
              }
            : {}),
        },
      },
      {
        $project: {
          _id: "$comments._id",
          name: "$comments.name",
          email: "$comments.email",
          content: "$comments.content",
          status: "$comments.status",
          createdAt: "$comments.createdAt",
          blog: {
            _id: "$_id",
            title: "$title",
            slug: "$slug",
            createdAt: "$createdAt",
          },
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $facet: {
          metadata: [{ $count: "total" }],
          comments: [{ $skip: skip }, { $limit: parseInt(limit) }],
        },
      },
    ];

    const result = await Content.aggregate(pipeline);

    const total = result[0]?.metadata[0]?.total || 0;
    const comments = result[0]?.comments || [];

    res.json({
      comments,
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error getting comments:", error);
    res.status(500).json({ error: "Failed to get comments" });
  }
};

// PUT /api/admin/comments/:commentId/moderate
export const moderateComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { status, moderationNotes } = req.body;
    const moderatorId = req.user?._id;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    // Find blog containing this comment
    const blog = await Content.findOne({ "comments._id": commentId });
    if (!blog) {
      return res.status(404).json({ error: "Comment not found" });
    }

    // Update comment
    const commentIndex = blog.comments.findIndex(
      (c) => c._id.toString() === commentId
    );

    if (commentIndex === -1) {
      return res.status(404).json({ error: "Comment not found" });
    }

    blog.comments[commentIndex].status = status;
    blog.comments[commentIndex].updatedAt = new Date();
    blog.comments[commentIndex].moderatedBy = moderatorId;

    if (moderationNotes) {
      blog.comments[commentIndex].moderationNotes = moderationNotes;
    }

    // Add to moderation history
    if (!blog.comments[commentIndex].moderationHistory) {
      blog.comments[commentIndex].moderationHistory = [];
    }

    blog.comments[commentIndex].moderationHistory.push({
      action: status,
      date: new Date(),
      moderator: moderatorId,
      notes: moderationNotes,
    });

    await blog.save();

    res.json({
      success: true,
      message: `Comment ${status} successfully`,
    });
  } catch (error) {
    console.error("Error moderating comment:", error);
    res.status(500).json({ error: "Failed to moderate comment" });
  }
};

// POST /api/admin/comments/bulk-moderate
export const bulkModerateComments = async (req, res) => {
  try {
    const { commentIds, status } = req.body;
    const moderatorId = req.user?._id;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    if (!Array.isArray(commentIds) || commentIds.length === 0) {
      return res.status(400).json({ error: "No comments selected" });
    }

    // Update all comments
    const result = await Content.updateMany(
      { "comments._id": { $in: commentIds } },
      {
        $set: {
          "comments.$[elem].status": status,
          "comments.$[elem].updatedAt": new Date(),
          "comments.$[elem].moderatedBy": moderatorId,
        },
        $push: {
          "comments.$[elem].moderationHistory": {
            action: status,
            date: new Date(),
            moderator: moderatorId,
            notes: "Bulk moderation",
          },
        },
      },
      {
        arrayFilters: [{ "elem._id": { $in: commentIds } }],
        multi: true,
      }
    );

    res.json({
      success: true,
      message: `${commentIds.length} comment(s) ${status} successfully`,
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("Error in bulk moderation:", error);
    res.status(500).json({ error: "Failed to moderate comments" });
  }
};

// DELETE /api/admin/comments/:commentId
export const deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;

    const result = await Content.updateOne(
      { "comments._id": commentId },
      { $pull: { comments: { _id: commentId } } }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({ error: "Comment not found" });
    }

    res.json({
      success: true,
      message: "Comment deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting comment:", error);
    res.status(500).json({ error: "Failed to delete comment" });
  }
};
