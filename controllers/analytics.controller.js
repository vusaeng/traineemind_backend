// src/controllers/analytics.controller.js
import Content from "../models/Content.js";
import User from "../models/User.js";

export async function overview(req, res, next) {
  try {
    const [
      totalUsers,
      totalContent,
      publishedContent,
      totalTutorials,
      totalBlogs,
      viewsAgg,
    ] = await Promise.all([
      User.countDocuments({}),
      Content.countDocuments({}),
      Content.countDocuments({ isPublished: true }),
      Content.countDocuments({ type: "video" }),
      Content.countDocuments({ type: "blog" }),
      Content.aggregate([
        {
          $group: {
            _id: null,
            views: { $sum: "$metrics.views" },
            likes: { $sum: "$metrics.likes" },
          },
        },
      ]),
    ]);

    // Get comment stats
    const blogs = await Content.find({ type: "blog" });
    let pendingComments = 0;
    blogs.forEach((blog) => {
      const blogComments = blog.comments || [];
      pendingComments += blogComments.filter(
        (c) => c.status === "pending"
      ).length;
    });

    const totals = viewsAgg[0] || { views: 0, likes: 0 };

    res.json({
      kpis: {
        totalUsers,
        totalContent,
        publishedContent,
        totalTutorials,
        totalBlogs,
        totalViews: totals.views,
        totalLikes: totals.likes,
        pendingComments,
      },
    });
  } catch (err) {
    next(err);
  }
}
