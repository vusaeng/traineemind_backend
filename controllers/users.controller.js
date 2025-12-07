import User from "../models/User.js";

/**
 * List users with optional search and pagination
 * GET /api/admin/users
 */
export async function list(req, res, next) {
  const {
    page = 1,
    limit = 10,
    q,
    sortBy = "createdAt",
    order = "desc",
  } = req.query;

  const filter = {};
  if (q) {
    filter.$or = [
      { name: { $regex: q, $options: "i" } },
      { email: { $regex: q, $options: "i" } },
    ];
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const sort = { [sortBy]: order === "asc" ? 1 : -1 };

  const [users, total] = await Promise.all([
    User.find(filter)
      .select("name email role isActive createdAt lastLogin")
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit)),
    User.countDocuments(filter),
  ]);

  res.json({
    users,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / limit),
    },
  });
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
      new: true,
    }).select("-passwordHash");

    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({ user });
  } catch (err) {
    next(err);
  }
}

// ✅ Get single user by ID or slug
export async function detail(req, res, next) {
  try {
    const { id } = req.params;
    const user = await User.findById(id).select("-passwordHash");
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({ user });
  } catch (err) {
    next(err);
  }
}

/** Delete user by id */
export async function remove(req, res, next) {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

/** Toggle user active status */

export async function toggleActive(req, res, next) {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    user.isActive = !user.isActive;
    await user.save();
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

export async function toggleRole(req, res, next) {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    user.role = user.role === "user" ? "admin" : "user";
    await user.save();
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

export default async function create(req, reset, next) {
  try {
    const { name, email, password, role } = req.body;
    const user = new User({ name, email, passwordHash: password, role });
    await user.save();
    res.status(201).json({ user });
  } catch (err) {
    next(err);
  }
}
