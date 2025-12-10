import { slugify } from "../utils/slugify.js";
import Content from "../models/Content.js";
import Category from "../models/Category.js";
import mongoose from "mongoose";

export async function createTutorial(req, res, next) {
  try {
    const { title, excerpt, body, categories, tags, project } = req.body;

    // Convert category names to ObjectIds
    let categoryIds = [];
    if (categories && categories.length) {
      categoryIds = await Promise.all(
        categories.map(async (cat) => {
          const found = await Category.findOne({ name: cat });
          return found ? found._id : null;
        })
      );
      categoryIds = categoryIds.filter(Boolean);
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
      video: {
        url: videoFile
          ? `/uploads/videos/${videoFile.filename}`
          : req.body.videoUrl,
        thumbnailUrl: thumbnailFile
          ? `/uploads/thumbnails/${thumbnailFile.filename}`
          : req.body.thumbnailUrl,
        provider: videoFile ? "selfhosted" : req.body.provider || "youtube",
        durationSec: req.body.durationSec,
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
      return res.status(404).json({ message: 'Tutorial not found' });
    }
    
    // If categories exist and are ObjectIds, populate them
    if (tutorial.categories && tutorial.categories.length > 0) {
      // Check if first category is an ObjectId
      const isObjectId = mongoose.Types.ObjectId.isValid(tutorial.categories[0]);
      
      if (isObjectId) {
        const populatedTutorial = await Content.findOne({ slug })
          .populate('categories')
          .populate('video')
          .lean();
        return res.json({ tutorial: populatedTutorial });
      }
    }
    
    // Otherwise just return the tutorial as-is
    res.json({ tutorial });
  } catch (error) {
    console.error('Error fetching tutorial:', error);
    res.status(500).json({ message: error.message });
  }
};

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
      req.query.limit
    );
    const filter = { type: "video" };
    if (q) filter.$text = { $search: q };
    if (categories) filter.categories = { $in: categories.split(",") };
    if (tags) filter.tags = { $in: tags.split(",") };

    const sort = { [sortBy]: order === "asc" ? 1 : -1 };
    const [tutorials, total] = await Promise.all([
      Content.find(filter)
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
