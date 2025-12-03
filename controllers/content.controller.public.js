import Content from "../models/Content.js";
import { buildPagination } from "../utils/pagination.js";

/**
 * List published content with search, filters, and pagination
 * GET /api/content
 */
export async function list(req, res, next) {
  try {
    const {
      q,
      type,
      categories,
      tags,
      sortBy = "publishedAt",
      order = "desc"
    } = req.query;

    const { page, limit, skip } = buildPagination(req.query.page, req.query.limit);

    const filter = {};
    if (q) filter.$text = { $search: q };
    if (type) filter.type = type;
    if (categories) filter.categories = { $in: categories.split(",") };
    if (tags) filter.tags = { $in: tags.split(",") };
    filter.isPublished = true;

    const sort = { [sortBy]: order === "asc" ? 1 : -1 };

    const [items, total] = await Promise.all([
      Content.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .select("-project.files") // exclude heavy project files in list
        .lean(),
      Content.countDocuments(filter)
    ]);

    res.json({
      items,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get a single published content item by slug
 * GET /api/content/:slug
 */
export async function getBySlug(req, res, next) {
  try {
    const content = await Content.findOne({
      slug: req.params.slug,
      isPublished: true
    })
      .populate("author", "name")
      .populate("categories", "name slug")
      .lean();

    if (!content) return res.status(404).json({ error: "Not found" });

    res.json({ content });
  } catch (err) {
    next(err);
  }
}
