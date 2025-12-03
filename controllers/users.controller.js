import User from "../models/User.js";

/**
 * List users with optional search and pagination
 * GET /api/admin/users
 */
export async function list(req, res, next) {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const q = req.query.q;
    const filter = q
      ? {
          $or: [
            { email: new RegExp(q, "i") },
            { name: new RegExp(q, "i") }
          ]
        }
      : {};

    const [items, total] = await Promise.all([
      User.find(filter)
        .select("-passwordHash")
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(filter)
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
 * Update a user’s role or active status
 * PATCH /api/admin/users/:id
 */
export async function update(req, res, next) {
  try {
    const { role, isActive } = req.body;

    const update = {};
    if (role) update.role = role;
    if (typeof isActive === "boolean") update.isActive = isActive;

    const user = await User.findByIdAndUpdate(req.params.id, update, {
      new: true
    }).select("-passwordHash");

    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({ user });
  } catch (err) {
    next(err);
  }
}
