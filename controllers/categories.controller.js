import Category from "../models/Category.js";

const slugify = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export async function create(req, res, next) {
  try {
    const { name, description, parent } = req.body;
    const slug = slugify(name);

    const exists = await Category.findOne({ slug });
    if (exists)
      return res.status(409).json({ error: "Category already exists" });

    const category = await Category.create({ name, slug, description, parent });
    res.status(201).json({ category });
  } catch (err) {
    next(err);
  }
}

export async function update(req, res, next) {
  try {
    const { name, description, parent } = req.body;
    const update = { description, parent };

    if (name) {
      update.name = name;
      update.slug = slugify(name);
    }

    const category = await Category.findByIdAndUpdate(req.params.id, update, {
      new: true,
    });
    if (!category) return res.status(404).json({ error: "Not found" });

    res.json({ category });
  } catch (err) {
    next(err);
  }
}

export async function remove(req, res, next) {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) return res.status(404).json({ error: "Not found" });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

/**
 *Public endpoint to list categories
 */

export async function list(req, res, next) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [categories, total] = await Promise.all([
      Category.find({}).skip(skip).limit(limit).lean(),
      Category.countDocuments(),
    ]);

    res.json({
      categories,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
}
