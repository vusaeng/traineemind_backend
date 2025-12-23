// src/controllers/content.controller.js
import Content from "../models/Content.js";

const slugify = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export async function create(req, res, next) {
  try {
    const {
      type,
      title,
      excerpt,
      body,
      categories,
      tags,
      video,
      project,
      transcript,
    } = req.body;
    const slug = slugify(title);

    const exists = await Content.findOne({ slug });
    if (exists) return res.status(409).json({ error: "Duplicate slug" });

    const content = await Content.create({
      type,
      title,
      slug,
      excerpt,
      body,
      transcript,
      author: req.user.name,
      categories,
      tags,
      video,
      project,
    });

    res.status(201).json({ content });
  } catch (err) {
    next(err);
  }
}

export async function update(req, res, next) {
  try {
    const update = { ...req.body };
    if (update.title) update.slug = slugify(update.title);

    const content = await Content.findByIdAndUpdate(req.params.id, update, {
      new: true,
    });
    if (!content) return res.status(404).json({ error: "Not found" });

    res.json({ content });
  } catch (err) {
    next(err);
  }
}

export async function remove(req, res, next) {
  try {
    const content = await Content.findByIdAndDelete(req.params.id);
    if (!content) return res.status(404).json({ error: "Not found" });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function publishToggle(req, res, next) {
  try {
    const content = await Content.findById(req.params.id);
    if (!content) return res.status(404).json({ error: "Not found" });

    content.isPublished = !content.isPublished;
    content.publishedAt = content.isPublished ? new Date() : null;
    await content.save();

    res.json({ content });
  } catch (err) {
    next(err);
  }
}

// ✅ List all content (optionally filter by type, category, published status)
export async function list(req, res, next) {
  try {
    const { type, category } = req.query;

    const filter = {};
    if (type) filter.type = type;
    if (category) filter.categories = category;

    // ✅ Role-based filtering
    if (!req.user || req.user.role !== "admin") {
      // Public users only see published content
      filter.isPublished = true;
    }
    // Admins see everything (published + drafts)

    const contents = await Content.find(filter)
      .populate("categories", "name")
      .populate("author", "name email")
      .sort({ createdAt: -1 });

    res.json({ contents });
  } catch (err) {
    next(err);
  }
}

// ✅ Get single content by ID or slug
export async function detail(req, res, next) {
  try {
    const { idOrSlug } = req.params;

    // Allow lookup by either MongoDB ObjectId or slug
    const query = idOrSlug.match(/^[0-9a-fA-F]{24}$/)
      ? { _id: idOrSlug }
      : { slug: idOrSlug };

    const content = await Content.findOne(query)
      .populate("categories", "name")
      .populate("author", "name email");

    if (!content) {
      return res.status(404).json({ error: "Content not found" });
    }

    // ✅ Role-based visibility
    if ((!req.user || req.user.role !== "admin") && !content.isPublished) {
      return res.status(403).json({
        error: "This content is not published yet",
      });
    }

    res.json({ content });
  } catch (err) {
    next(err);
  }
}
