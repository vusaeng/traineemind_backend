import Content from "../models/Content.js";
import { buildPagination } from "../utils/pagination.js";
import mongoose from "mongoose";

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
    } = req.query;

    const { page, limit, skip } = buildPagination(
      req.query.page,
      req.query.limit
    );

    const filter = { type: "blog" };

    // Add filter for public access
    if (req.route.path === "/blogs") {
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
