import { slugify } from "../utils/slugify.js";
import Content from "../models/Content.js";
import mongoose from "mongoose";

export async function createBlog(req, res, next) {
  try {
    console.log("Create Blog - Request Body:", req.body);

    // Destructure with defaults
    const {
      title,
      excerpt = "",
      body,
      categories = [],
      tags = [],
      featuredImageUrl = "",
      isPublished = false,
    } = req.body;

    // Validate required fields
    if (!title || !title.trim()) {
      return res.status(400).json({
        error: "Title is required",
      });
    }

    if (!body || !body.trim()) {
      return res.status(400).json({
        error: "Content is required",
      });
    }

    // Ensure categories and tags are arrays
    const categoryArray = Array.isArray(categories)
      ? categories
      : categories
        ? [categories]
        : [];

    const tagsArray = Array.isArray(tags)
      ? tags
      : typeof tags === "string"
        ? tags.split(",").map((t) => t.trim())
        : [];

    // Convert category IDs to ObjectIds and validate
    let categoryIds = [];
    if (categoryArray.length > 0) {
      categoryIds = categoryArray.filter(
        (cat) => cat && mongoose.Types.ObjectId.isValid(cat)
      );
    }

    const slug = slugify(title);

    // Check for duplicate slug (only for blogs)
    const exists = await Content.findOne({ slug, type: "blog" });
    if (exists) {
      return res.status(409).json({
        error:
          "A blog with this title already exists. Please choose a different title.",
      });
    }

    const blog = await Content.create({
      type: "blog",
      title: title.trim(),
      slug,
      excerpt: excerpt.trim(),
      body,
      author: req.user.id,
      categories: categoryIds,
      tags: tagsArray.filter((tag) => tag && tag.trim()),
      featuredImage: featuredImageUrl || null,
      isPublished: Boolean(isPublished),
      metrics: {
        views: 0,
      },
    });

    console.log("Blog created successfully:", blog._id);

    // Populate categories for response
    const populatedBlog = await Content.findById(blog._id)
      .populate("categories")
      .lean();

    res.status(201).json({
      message: "Blog created successfully",
      blog: populatedBlog,
    });
  } catch (err) {
    console.error("Error in createBlog:", err);

    // Handle specific MongoDB errors
    if (err.name === "ValidationError") {
      return res.status(400).json({
        error: "Validation failed",
        details: err.message,
      });
    }

    if (err.code === 11000) {
      // Duplicate key error
      return res.status(409).json({
        error: "A blog with this title or slug already exists",
      });
    }

    next(err);
  }
}

// Detail function remains the same
export async function detail(req, res, next) {
  try {
    const { slug } = req.params;

    // Get blog with populated categories and author
    const blog = await Content.findOne({ slug, type: "blog" })
      .populate("categories")
      .populate("author", "name email")
      .lean();

    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }

    res.json({ blog });
  } catch (error) {
    console.error("Error fetching blog:", error);
    res.status(500).json({ message: error.message });
  }
}

// List function - updated to include author population
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

    // Filter by publish status
    if (isPublished !== undefined) {
      filter.isPublished = isPublished === "true";
    }

    const sort = { [sortBy]: order === "asc" ? 1 : -1 };

    const [blogs, total] = await Promise.all([
      Content.find(filter)
        .populate("categories")
        .populate("author", "name")
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

// Update function remains similar but simplified
export async function updateBlog(req, res, next) {
  try {
    const { slug } = req.params;
    const blog = await Content.findOne({ slug, type: "blog" });

    if (!blog) {
      return res.status(404).json({ error: "Blog not found" });
    }

    const {
      title,
      excerpt,
      body,
      categories = [],
      tags = [],
      featuredImageUrl,
      isFeatured,
      isPublished,
    } = req.body;

    const originalSlug = blog.slug;
    let newSlug = originalSlug;

    // Update title and slug if title changed
    if (title && title !== blog.title) {
      newSlug = slugify(title);

      // Check if new slug already exists for blogs
      const slugExists = await Content.findOne({
        slug: newSlug,
        type: "blog",
        _id: { $ne: blog._id },
      });

      if (slugExists) {
        return res.status(409).json({
          error: "A blog with this title already exists",
        });
      }

      blog.title = title;
      blog.slug = newSlug;
    }

    // Update other fields
    if (excerpt !== undefined) blog.excerpt = excerpt;
    if (body !== undefined) blog.body = body;

    // Update categories
    if (categories !== undefined) {
      const validCategories = Array.isArray(categories)
        ? categories.filter((catId) => mongoose.Types.ObjectId.isValid(catId))
        : [];
      blog.categories = validCategories;
    }

    // Update tags
    if (tags !== undefined) {
      const tagsArray = Array.isArray(tags)
        ? tags
        : typeof tags === "string"
          ? tags.split(",").map((t) => t.trim())
          : [];
      blog.tags = tagsArray.filter((tag) => tag && tag.trim());
    }

    if (featuredImageUrl !== undefined) {
      blog.featuredImage = featuredImageUrl || null;
    }

    if (isPublished !== undefined) {
      blog.isPublished = Boolean(isPublished);
    }

    if (isFeatured !== undefined) {
      blog.isFeatured = Boolean(isFeatured);
    }

    blog.updatedAt = new Date();
    await blog.save();

    // Populate categories for response
    const populatedBlog = await Content.findById(blog._id)
      .populate("categories")
      .populate("author", "name")
      .lean();

    res.json({
      message: "Blog updated successfully",
      blog: populatedBlog,
      originalSlug,
      slugChanged: originalSlug !== newSlug,
    });
  } catch (err) {
    console.error("Error updating blog:", err);
    next(err);
  }
}

// Delete function remains the same
export async function deleteBlog(req, res, next) {
  try {
    const { slug } = req.params;
    const blog = await Content.findOneAndDelete({ slug, type: "blog" });

    if (!blog) {
      return res.status(404).json({ error: "Blog not found" });
    }

    res.json({
      message: "Blog deleted successfully",
      blogId: blog._id,
    });
  } catch (err) {
    console.error("Error deleting blog:", err);
    next(err);
  }
}
