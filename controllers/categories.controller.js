import Category from "../models/Category.js";

const slugify = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export async function create(req, res, next) {
  try {
    const { name, description, parent } = req.body;
    const slug = slugify(name);

    const exists = await Category.findOne({ slug });
    if (exists) return res.status(409).json({ error: "Category already exists" });

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

    const category = await Category.findByIdAndUpdate(req.params.id, update, { new: true });
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
 * Optional: Public endpoint to list categories
 */
export async function list(req, res, next) {
  try {
    const categories = await Category.find({}).lean();
    res.json({ categories });
  } catch (err) {
    next(err);
  }
}
