import Content from "../models/Content.js";
import { buildPagination } from "../utils/pagination.js";
import mongoose from "mongoose";
import BlogView from "../models/BlogView.js";
import Category from "../models/Category.js";

const slugify = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

/**
 * List published content with search, filters, and pagination
 * GET /api/content
 */
// controllers/blogController.js - Update list function
export async function list(req, res, next) {
  const buildPagination = (page = 1, limit = 10) => {
    page = parseInt(page);
    limit = parseInt(limit);
    const skip = (page - 1) * limit;
    return { page, limit, skip };
  };

  try {
    const {
      q,
      categories,
      tags,
      sortBy = "createdAt",
      order = "desc",
      isPublished,
      isFeatured,
    } = req.query;

    const { page, limit, skip } = buildPagination(
      req.query.page,
      req.query.limit
    );

    const filter = {
      type: "blog",
    };

    // Add filter for public access
    if (req.route.path === "/blogs" || req.route.path === "/tutorials") {
      // Public endpoint
      filter.isPublished = true;
    }

    // Search query
    if (q) {
      filter.$or = [
        { title: { $regex: q, $options: "i" } },
        { excerpt: { $regex: q, $options: "i" } },
        { body: { $regex: q, $options: "i" } },
      ];
    }

    // Filter by categories
    if (categories) {
      const categoryIds = categories
        .split(",")
        .filter((id) => mongoose.Types.ObjectId.isValid(id));
      if (categoryIds.length > 0) {
        filter.categories = { $in: categoryIds };
      }
    }

    // Filter by tags
    if (tags) {
      const tagArray = tags.split(",").map((tag) => tag.trim());
      filter.tags = { $in: tagArray };
    }

    // Filter by publish status (for admin)
    if (isPublished !== undefined && req.route.path === "/admin/blogs") {
      filter.isPublished = isPublished === "true";
    }

    const sort = { [sortBy]: order === "asc" ? 1 : -1 };

    // POPULATE categories and author
    const [blogs, total] = await Promise.all([
      Content.find(filter)
        .populate("categories", "name slug") // Only get name and slug
        .populate("author", "name email avatar") // Get author details
        .populate("isFeatured") // Populate isFeatured field
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Content.countDocuments(filter),
    ]);

    res.json({
      blogs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("Error in blog list:", err);
    next(err);
  }
}

/**
 * Get a single published content item by slug
 * GET /api/content/:slug
 */
export async function getBySlug(req, res, next) {
  try {
    const blog = await Content.findOne({
      slug: req.params.slug,
      isPublished: true,
    })
      .populate("author", "name")
      .populate("categories", "name slug")
      .lean();

    if (!blog) return res.status(404).json({ error: "Blog not found" });

    res.json({ blog });
  } catch (err) {
    next(err);
  }
}

/**
 * Public endpoint to list categories
 */
export async function listCategories(req, res, next) {
  try {
    const categories = await Category.find({}).lean();
    if (!categories) {
      return res.status(404).json({ error: "No categories found" });
    }
    res.json({ categories });
  } catch (err) {
    next(err);
  }
}

// List content by category
export async function listByCategory(req, res, next) {
  try {
    const { category } = req.query;
    if (!category) {
      return res.status(400).json({ error: "Category is required" });
    }
    const contents = await Content.find({
      categories: category,
      isPublished: true,
    })
      .populate("author", "name")
      .populate("categories", "name slug")
      .sort({ publishedAt: -1 })
      .lean();
    res.json({ contents });
  } catch (err) {
    next(err);
  }
}

/**Increment view count for public blogs POST /content/:slug/view*/

export async function incrementViewCount(req, res, next) {
  try {
    const { slug } = req.params;
    const blog = await Content.findOne({
      slug,
      isPublished: true,
      type: "blog",
    });
    if (!blog) {
      return res.status(404).json({ error: "Not found" });
    }
    blog.metrics.views = (blog.metrics.views || 0) + 1;
    await blog.save();
    res.json({ viewCount: blog.metrics.views });
  } catch (err) {
    next(err);
  }
}

// POST /api/content/:id/view - Increment view count and log view date with IP tracking
// POST /api/content/:id/view - Track blog view with IP/userAgent
export const trackBlogView = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid blog ID format",
      });
    }

    const clientIP =
      req.ip ||
      req.headers["x-forwarded-for"]?.split(",")[0] ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      "Unknown";

    const userAgent = req.get("User-Agent") || "Unknown";

    // Find the blog first to check status
    const blog = await Content.findOne({
      _id: id,
      type: "blog",
      isPublished: true, // Consistent with other functions
    });

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found or not published",
      });
    }

    // Check for duplicate views from same IP within 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const recentViewFromIP = await BlogView.findOne({
      blog: id,
      ipAddress: clientIP,
      viewedAt: { $gte: twentyFourHoursAgo },
    });

    if (recentViewFromIP) {
      return res.json({
        success: true,
        message: "View already recorded for this IP address (24h cooldown)",
        data: {
          views: blog.metrics?.views || 0, // Consistent with your other function
          isNewView: false,
        },
      });
    }

    // Create view record
    const blogView = new BlogView({
      blog: id,
      ipAddress: clientIP,
      userAgent: userAgent,
      viewedAt: new Date(),
    });

    // Update blog view count
    const updatedBlog = await Content.findOneAndUpdate(
      {
        _id: id,
        type: "blog",
        isPublished: true,
      },
      {
        $inc: { "metrics.views": 1 },
        $push: { viewDates: new Date() },
      },
      {
        new: true,
        upsert: false,
      }
    );

    // Don't await - fire and forget. Make BlogView Save Non-Blocking
    blogView.save().catch(console.error);

    res.json({
      success: true,
      data: {
        views: updatedBlog.metrics?.views || 0,
        isNewView: true,
      },
    });
  } catch (error) {
    console.error("Error tracking blog view:", error);
    res.status(500).json({
      success: false,
      message: "Server error while tracking view",
    });
  }
};

export async function commentsAdd(req, res, next) {
  try {
    const { slug } = req.params;
    const { name, email, content } = req.body;

    if (!name || !email || !content) {
      return res.status(400).json({
        error: "Name, email, and content are required",
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: "Please enter a valid email address",
      });
    }

    const blog = await Content.findOne({
      slug,
      isPublished: true,
      type: "blog",
    });

    if (!blog) {
      return res.status(404).json({ error: "Blog not found" });
    }

    const comment = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      content: content.trim(),
      status: "pending", // Default to pending
      createdAt: new Date(),
    };

    blog.comments = blog.comments || [];
    blog.comments.push(comment);
    await blog.save();

    // Optional: Send notification to admin
    // await sendCommentNotification(blog, comment);

    res.status(201).json({
      comment,
      message:
        "Comment submitted for moderation. It will appear after approval.",
    });
  } catch (err) {
    next(err);
  }
}

/** get comments for public blogs GET /content/:slug/comments*/
export async function commentsList(req, res, next) {
  try {
    const { slug } = req.params;
    const { showPending } = req.query; // Optional: for admin preview

    const blog = await Content.findOne({
      slug,
      isPublished: true,
      type: "blog",
    }).lean();

    if (!blog) {
      return res.status(404).json({ error: "Blog not found" });
    }

    let comments = blog.comments || [];

    // For public API, only show approved comments
    // For admin, you can add a secret parameter to see pending
    if (showPending !== "true") {
      comments = comments.filter((comment) => comment.status === "approved");
    }

    // Sort by newest first
    comments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ comments });
  } catch (err) {
    next(err);
  }
}
