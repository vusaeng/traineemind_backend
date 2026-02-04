import { slugify } from "../utils/slugify.js";
import Content from "../models/Content.js";
import Category from "../models/Category.js";
import mongoose from "mongoose";

export async function createTutorial(req, res, next) {
  try {
    const {
      title,
      excerpt,
      body,
      author,
      categories,
      tags,
      project,
      videoUrl,
      thumbnailUrl,
      provider,
      durationSec, // Add this
      estimatedTime, // Add this
    } = req.body;

    // Handle video URL from either req.body.videoUrl OR req.body.video.url
    let finalVideoUrl = videoUrl;
    let finalThumbnailUrl = thumbnailUrl;
    let finalProvider = provider || "youtube";

    // Check if video data is nested
    if (req.body.video && req.body.video.url) {
      finalVideoUrl = req.body.video.url;
      finalThumbnailUrl = req.body.video.thumbnailUrl;
      finalProvider = req.body.video.provider || finalProvider;
    }

    // Convert category names to ObjectIds
    let categoryIds = [];
    if (categories && categories.length) {
      // Filter valid ObjectIds
      categoryIds = categories.filter((cat) =>
        mongoose.Types.ObjectId.isValid(cat),
      );
    }

    const slug = slugify(title);

    const exists = await Content.findOne({ slug });
    if (exists) return res.status(409).json({ error: "Duplicate slug" });

    // Handle uploaded files (via Multer)
    const videoFile = req.files?.video?.[0];
    const thumbnailFile = req.files?.thumbnail?.[0];

    const tutorial = await Content.create({
      type: "video", // ✅ always video
      title,
      slug,
      excerpt,
      body,
      author: req.user.id,
      categories: categoryIds,
      tags,
      project,
      estimatedTime: estimatedTime || Math.ceil((durationSec || 0) / 60),
      video: {
        url: videoFile
          ? `/uploads/videos/${videoFile.filename}`
          : finalVideoUrl, // Use the extracted URL
        thumbnailUrl: thumbnailFile
          ? `/uploads/thumbnails/${thumbnailFile.filename}`
          : finalThumbnailUrl, // Use the extracted thumbnail URL
        provider: videoFile ? "selfhosted" : finalProvider,
        durationSec: req.body.durationSec || durationSec || 0,
        transcript: req.body.transcript,
        quality: req.body.quality || ["720p"],
      },
    });

    res.status(201).json({ tutorial });
  } catch (err) {
    next(err);
  }
}

/* export async function detail(req, res, next) {
  try {
    const tutorial = await Content.findOne({
      slug: req.params.slug,
      type: "video",
    })
      .populate("author", "name")
      .populate("categories", "name slug")
      .lean();
    if (!tutorial) return res.status(404).json({ error: "Tutorial not found" });

    res.json({ tutorial });
  } catch (err) {
    next(err);
  }
} */

// Quick fix for the cast error
export async function detail(req, res, next) {
  try {
    const { slug } = req.params;

    // First, just get the tutorial without populate
    const tutorial = await Content.findOne({ slug }).lean();

    if (!tutorial) {
      return res.status(404).json({ message: "Tutorial not found" });
    }

    // If categories exist and are ObjectIds, populate them
    if (tutorial.categories && tutorial.categories.length > 0) {
      // Check if first category is an ObjectId
      const isObjectId = mongoose.Types.ObjectId.isValid(
        tutorial.categories[0],
      );

      if (isObjectId) {
        const populatedTutorial = await Content.findOne({ slug })
          .populate("categories")
          .populate("video")
          .lean();
        return res.json({ tutorial: populatedTutorial });
      }
    }

    // Otherwise just return the tutorial as-is
    res.json({ tutorial });
  } catch (error) {
    console.error("Error fetching tutorial:", error);
    res.status(500).json({ message: error.message });
  }
}

/* Route GET /tutorials */
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
    } = req.query;

    const { page, limit, skip } = buildPagination(
      req.query.page,
      req.query.limit,
    );

    const filter = { type: "video" };

    // Search query
    if (q) filter.$text = { $search: q };

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

    const sort = { [sortBy]: order === "asc" ? 1 : -1 };

    const [tutorials, total] = await Promise.all([
      Content.find(filter)
        .populate("categories", "name slug") // Only get name and slug
        .populate("author", "name email avatar") // Get author details
        .populate("isFeatured") // Populate isFeatured field
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .select("-project.files") // exclude heavy project files in list
        .lean(),
      Content.countDocuments(filter),
    ]);

    res.json({
      tutorials,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    next(err);
  }
}

/* Route PATCH /tutorial/:slug  */

export async function updateTutorial(req, res, next) {
  try {
    const { slug } = req.params;
    const tutorial = await Content.findOne({ slug, type: "video" });

    if (!tutorial) {
      return res.status(404).json({ error: "Tutorial not found" });
    }

    const {
      title,
      excerpt,
      body,
      transcript,
      isPublished,
      categories,
      tags,
      project,
      video,
      prerequisites,
      learningObjectives,
    } = req.body;
    const originalSlug = tutorial.slug;
    let newSlug = originalSlug;

    // Update title and slug if title changed
    if (title && title !== tutorial.title) {
      newSlug = slugify(title);

      // Check if new slug already exists for videos
      const slugExists = await Content.findOne({
        slug: newSlug,
        type: "video",
        _id: { $ne: tutorial._id },
      });

      if (slugExists) {
        return res.status(409).json({
          error: "A tutorial with this title already exists",
        });
      }

      tutorial.title = title;
      tutorial.slug = newSlug;
    }

    // Update other fields
    if (excerpt !== undefined) tutorial.excerpt = excerpt;
    if (body !== undefined) tutorial.body = body;
    if (transcript !== undefined) tutorial.transcript = transcript;
    if (learningObjectives !== undefined)
      tutorial.learningObjectives = learningObjectives;
    if (prerequisites !== undefined) tutorial.prerequisites = prerequisites;

    if (isPublished !== undefined) tutorial.isPublished = isPublished;

    // Update categories if provided
    if (categories !== undefined) {
      const validCategories = categories.filter((catId) =>
        mongoose.Types.ObjectId.isValid(catId),
      );
      tutorial.categories = validCategories;
    }

    if (tags !== undefined) tutorial.tags = tags;
    if (project !== undefined) tutorial.project = project;

    // Update video data
    if (video) {
      tutorial.video = {
        ...tutorial.video,
        ...video,
        provider:
          video.provider ||
          (video.url?.includes("vimeo") ? "vimeo" : "youtube"),
      };
    }

    tutorial.updatedAt = new Date();
    await tutorial.save();

    // Populate categories for response
    const populatedTutorial = await Content.findById(tutorial._id)
      .populate("categories")
      .lean();

    // Include original slug in response for frontend reference
    res.json({
      message: "Tutorial updated successfully",
      tutorial: populatedTutorial,
      originalSlug, // Send original slug for comparison
      slugChanged: originalSlug !== newSlug,
    });
  } catch (err) {
    next(err);
  }
}

/* Route DELETE /tutorial/:slug */

export async function deleteTutorial(req, res, next) {
  try {
    const { slug } = req.params;
    const tutorial = await Content.findOneAndDelete({ slug, type: "video" });
    if (!tutorial) return res.status(404).json({ error: "Tutorial not found" });
    res.json({ message: "Tutorial deleted" });
  } catch (err) {
    next(err);
  }
}
