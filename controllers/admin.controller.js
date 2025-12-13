import User from "../models/User.js";
import mongoose from "mongoose";

/**
 * List users with optional search and pagination
 * GET /api/admin/users
 */
export async function list(req, res, next) {
  try {
    const { page = 1, limit = 10, search, role, status } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    if (role && role !== "all") {
      query.role = role;
    }

    if (status && status !== "all") {
      query.isActive = status === "active";
    }

    const [users, total] = await Promise.all([
      User.find(query)
        .select("_id email name role isActive verified createdAt lastLogin") // Explicitly include _id
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 }),
      User.countDocuments(query),
    ]);

    // Log to debug
    console.log(`📋 Fetched ${users.length} users`);
    users.forEach((user) => {
      console.log(`  - ${user.email}: _id = ${user._id}`);
    });

    res.json({
      users,
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
      page: parseInt(page),
      limit: parseInt(limit),
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
      new: true,
    }).select("-passwordHash");

    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({ user });
  } catch (err) {
    next(err);
  }
}

// ✅ Get single user by ID or slug - FIXED VERSION
export async function detail(req, res, next) {
  try {
    const { id } = req.params;

    console.log("🔍 User detail requested:");
    console.log("  - ID from params:", id);
    console.log("  - Type of ID:", typeof id);
    console.log("  - Full URL:", req.originalUrl);
    console.log("  - Full params:", req.params);

    // Check if id is "undefined" or empty
    if (!id || id === "undefined" || id === "null") {
      console.log("❌ Invalid user ID received:", id);
      return res.status(400).json({ error: "Invalid user ID" });
    }

    // Validate if it's a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.log("❌ Invalid ObjectId format:", id);
      return res.status(400).json({ error: "Invalid user ID format" });
    }

    console.log("✅ Valid ID, fetching user from database...");
    const user = await User.findById(id).select("-passwordHash");
    if (!user) {
      console.log("❌ User not found in database for ID:", id);
      return res.status(404).json({ error: "User not found" });
    }

    console.log("✅ User found:", user.email);
    res.json({ user });
  } catch (err) {
    console.error("🔥 Error in user detail:", err);
    next(err);
  }
}

/**DLETE USER api/admin/:id */

export async function remove(req, res, netx) {
  try {
    const { id } = req.params;

    // Validate ID
    if (!id || id === "undefined" || id === "null") {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid user ID format" });
    }

    const user = await User.findByIdAndDelete(id);
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({ message: "User deleted successfully" });
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

export async function create(req, res, next) {
  try {
    const { name, email, password, role } = req.body;
    const user = new User({ name, email, passwordHash: password, role });
    await user.save();
    res.status(201).json({ user });
  } catch (err) {
    next(err);
  }
}

// user.controller.js
export async function getUserStats(req, res, next) {
  try {
    // Get counts from database
    const [
      totalAdmins,
      totalUsers,
      totalActive,
      totalInactive,
      totalVerified,
      totalUnverified,
      totalAllUsers,
    ] = await Promise.all([
      User.countDocuments({ role: "admin" }),
      User.countDocuments({ role: "user" }),
      User.countDocuments({ isActive: true }),
      User.countDocuments({ isActive: false }),
      User.countDocuments({ verified: true }),
      User.countDocuments({ verified: false }),
      User.countDocuments({}),
    ]);

    // Calculate growth rate (this month vs last month)
    const currentMonth = new Date();
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    const currentMonthUsers = await User.countDocuments({
      createdAt: {
        $gte: new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1),
        $lt: new Date(
          currentMonth.getFullYear(),
          currentMonth.getMonth() + 1,
          1
        ),
      },
    });

    const lastMonthUsers = await User.countDocuments({
      createdAt: {
        $gte: new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1),
        $lt: new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 1),
      },
    });

    const growthRate =
      lastMonthUsers > 0
        ? (
            ((currentMonthUsers - lastMonthUsers) / lastMonthUsers) *
            100
          ).toFixed(1)
        : currentMonthUsers > 0
          ? 100
          : 0;

    res.json({
      stats: {
        totalAdmins,
        totalUsers,
        totalActive,
        totalInactive,
        totalVerified,
        totalUnverified,
        totalAllUsers: totalAdmins + totalUsers,
        growthRate: parseFloat(growthRate),
        currentMonthUsers,
        lastMonthUsers,
      },
    });
  } catch (err) {
    next(err);
  }
}
