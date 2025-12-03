// src/controllers/content.controller.js
import Content from "../models/Content.js";

const slugify = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export async function create(req, res, next) {
  try {
    const { type, title, excerpt, body, categories, tags, video, project } = req.body;
    const slug = slugify(title);

    const exists = await Content.findOne({ slug });
    if (exists) return res.status(409).json({ error: "Duplicate slug" });

    const content = await Content.create({
      type,
      title,
      slug,
      excerpt,
      body,
      author: req.user.id,
      categories,
      tags,
      video,
      project
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

    const content = await Content.findByIdAndUpdate(req.params.id, update, { new: true });
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
