import User from "../models/User.js";
import mongoose from "mongoose";
import crypto from "crypto";
import sendEmail from "../utils/sendEmail.js"; // Default import
import bcrypt from "bcryptjs";

/**
 * List users with optional search and pagination
 * GET /api/admin/users
 */
export async function list(req, res, next) {
  try {
    const { page = 1, limit = 10, search, role, status, verified } = req.query;
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

    if (verified && verified !== "all") {
      query.verified = verified === "active";
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
    const { role, name, email, phone, bio, password, isActive, verified } =
      req.body;

    const update = {};
    if (role) update.role = role;
    if (name) update.name = name;
    if (email) update.email = email;
    if (phone) update.phone = phone;
    if (bio) update.bio = bio;
    if (password) {
      // Manually hash the password before saving
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      update.passwordHash = hashedPassword;
    }

    if (typeof isActive === "boolean") update.isActive = isActive;
    if (typeof verified === "boolean") update.verified = verified;

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

// ✅ Get individual user statistics
export async function getUserIndividualStats(req, res, next) {
  try {
    const { id } = req.params;

    console.log(`📊 Fetching statistics for user: ${id}`);

    // Validate ID
    if (!id || id === "undefined" || id === "null") {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid user ID format" });
    }

    // Check if user exists
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Get current date for calculations
    const now = new Date();

    // 1. Total Content Created (Admins only, or all users if you prefer)
    let totalContentCreated = 0;
    let totalContentPublished = 0;

    // Check user role - adjust this logic based on your requirements
    if (user.role === "admin") {
      // Count all content created by this admin
      // Adjust based on your content models
      try {
        // Example if you have separate models:
        const [
          totalTutorials,
          publishedTutorials,
          totalBlogs,
          publishedBlogs,
          totalContent,
          publishedContent,
        ] = await Promise.all([
          Tutorial.countDocuments({ author: id }),
          Tutorial.countDocuments({ author: id, isPublished: true }),
          Blog.countDocuments({ author: id }),
          Blog.countDocuments({ author: id, isPublished: true }),
          Content.countDocuments({ author: id }),
          Content.countDocuments({ author: id, isPublished: true }),
        ]);

        totalContentCreated = totalTutorials + totalBlogs + totalContent;
        totalContentPublished =
          publishedTutorials + publishedBlogs + publishedContent;
      } catch (contentError) {
        console.log("⚠️ Content models might not exist, using fallback logic");
        // Fallback if content models don't exist
        totalContentCreated = 0;
        totalContentPublished = 0;
      }
    } else {
      // For non-admin users, you might still want to track their content
      // Adjust based on your application logic
      try {
        const userContent = await Content.countDocuments({ author: id });
        const publishedUserContent = await Content.countDocuments({
          author: id,
          isPublished: true,
        });

        totalContentCreated = userContent;
        totalContentPublished = publishedUserContent;
      } catch {
        totalContentCreated = 0;
        totalContentPublished = 0;
      }
    }

    // 2. Login Count
    // You need to track login count in your User model
    // Add this field to your User model if not already there:
    // loginCount: { type: Number, default: 0 }
    const loginCount = user.loginCount || 0;

    // 3. Days Since Last Active
    let daysSinceLastActive = 0;
    if (user.lastLogin) {
      const lastLoginDate = new Date(user.lastLogin);
      const diffTime = Math.abs(now - lastLoginDate);
      daysSinceLastActive = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    } else if (user.lastActivity) {
      // Alternative: Use lastActivity field if you have it
      const lastActivityDate = new Date(user.lastActivity);
      const diffTime = Math.abs(now - lastActivityDate);
      daysSinceLastActive = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    } else {
      // Fallback to account creation date
      const createdAt = new Date(user.createdAt);
      const diffTime = Math.abs(now - createdAt);
      daysSinceLastActive = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    }

    // 4. Additional stats you might want
    const accountAgeDays = Math.floor(
      (now - new Date(user.createdAt)) / (1000 * 60 * 60 * 24)
    );

    // Content creation rate (per month)
    const contentPerMonth =
      accountAgeDays > 30
        ? (totalContentCreated / (accountAgeDays / 30)).toFixed(1)
        : totalContentCreated;

    // Publication rate
    const publicationRate =
      totalContentCreated > 0
        ? ((totalContentPublished / totalContentCreated) * 100).toFixed(1)
        : 0;

    res.json({
      success: true,
      stats: {
        // Core requested stats
        totalContentCreated,
        totalContentPublished,
        loginCount,
        daysSinceLastActive,

        // Additional useful stats
        accountAgeDays,
        contentPerMonth,
        publicationRate,

        // User info for context
        userInfo: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          verified: user.verified,
          createdAt: user.createdAt,
          lastLogin: user.lastLogin,
        },

        // Timestamp
        generatedAt: now.toISOString(),

        // Quick summary
        summary: {
          activityLevel:
            daysSinceLastActive <= 1
              ? "Very Active"
              : daysSinceLastActive <= 7
                ? "Active"
                : daysSinceLastActive <= 30
                  ? "Moderate"
                  : "Inactive",
          contentCreator:
            totalContentCreated > 10
              ? "High"
              : totalContentCreated > 3
                ? "Medium"
                : totalContentCreated > 0
                  ? "Low"
                  : "None",
          loginFrequency:
            loginCount > 50
              ? "Very Frequent"
              : loginCount > 20
                ? "Frequent"
                : loginCount > 5
                  ? "Occasional"
                  : "Rare",
        },
      },
    });
  } catch (err) {
    console.error("❌ Error fetching individual user statistics:", err);
    next(err);
  }
}

// ✅ Reset user password (admin initiated)

// Helper function to generate random password
const generateRandomPassword = () => {
  const length = 12;
  const charset =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
};

// Email template for password reset
const passwordResetEmailTemplate = (email, newPassword) => `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4f46e5; color: white; padding: 20px; text-align: center; }
        .content { background: #f9fafb; padding: 30px; border-radius: 8px; margin: 20px 0; }
        .password-box { 
            background: #fff; 
            border: 2px dashed #4f46e5; 
            padding: 15px; 
            text-align: center; 
            font-size: 18px; 
            font-weight: bold; 
            margin: 20px 0;
            font-family: monospace;
            letter-spacing: 1px;
        }
        .warning { color: #dc2626; background: #fee2e2; padding: 10px; border-radius: 4px; margin: 15px 0; }
        .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Password Reset Request</h1>
        </div>
        
        <div class="content">
            <p>Hello,</p>
            
            <p>Your password has been reset by an administrator. Here is your new temporary password:</p>
            
            <div class="password-box">
                ${newPassword}
            </div>
            
            <div class="warning">
                ⚠️ <strong>Important:</strong> Please change this password immediately after logging in.
            </div>
            
            <p>To log in:</p>
            <ol>
                <li>Go to ${process.env.FRONTEND_URL || "your application"}/login</li>
                <li>Enter your email: <strong>${email}</strong></li>
                <li>Use the temporary password above</li>
                <li>You will be prompted to set a new password</li>
            </ol>
            
            <p>If you didn't request this password reset, please contact our support team immediately.</p>
            
            <p>Best regards,<br>The TraineeMind Admin Team</p>
        </div>
        
        <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
            <p>© ${new Date().getFullYear()} TraineeMind. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
`;

// Admin reset user password (generate new password)

export const adminResetPassword = async (req, res) => {
  try {
    const { id } = req.params;

    // Find user
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Generate random password
    const randomPassword = generateRandomPassword();

    // Manually hash the password before saving
    // This ensures it's hashed even if pre-save middleware doesn't fire
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(randomPassword, salt);

    // Update password with hashed version
    user.password = hashedPassword;

    // Also mark the password as modified to trigger any other middleware
    user.markModified("password");

    // Clear any existing reset tokens
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    // Send email with new password
    try {
      const html = passwordResetEmailTemplate(user.email, randomPassword);
      const text = `Your password has been reset by an administrator. Your new temporary password is: ${randomPassword}. Please change it immediately after logging in.`;

      await sendEmail(
        user.email,
        "Password Reset by Administrator - TraineeMind",
        text,
        html
      );
    } catch (emailError) {
      console.error("Failed to send email:", emailError);
      // Continue even if email fails, but log it
    }

    // Log the action
    console.log(
      `Admin ${req.user.email} reset password for user ${user.email}`
    );

    res.json({
      message:
        "Password reset successfully. New password has been sent to user's email.",
      resetAt: new Date(),
      admin: req.user.email,
      userEmail: user.email,
      // In development, return the password for testing
      ...(process.env.NODE_ENV === "development" && {
        tempPassword: randomPassword,
      }),
    });
  } catch (error) {
    console.error("Error resetting password:", error);
    res.status(500).json({ error: "Failed to reset password" });
  }
};

// Admin send password reset link
export const adminSendResetLink = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");

    // Hash token before saving
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    // Set hashed token and expiry
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

    await user.save();

    // Create reset URL with unhashed token
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    // Email template
    const html = `
<!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8" />
      <title>Password Reset Request</title>
    </head>
    <body style="font-family: Arial, sans-serif; background-color: #f9fafb; padding: 40px;">
      <table width="100%" style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
        <tr>
          <td style="background: #1e3a8a; padding: 20px; text-align: center; color: #ffffff;">
            <h1 style="margin: 0;">TraineeMind</h1>
          </td>
        </tr>
        <tr>
          <td style="padding: 30px;">
            <h2 style="color: #111827;">Reset Your Password</h2>
            <p style="color: #374151; font-size: 16px;">
              A TraneeMind administrator has requested a password reset for your account. Click the button below to set a new password:
            </p>
            <p style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background: #1e3a8a; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                Reset Password
              </a>
            </p>
            <p style="color: #6b7280; font-size: 14px;">
              This link will expire after 1 hour. If you didn’t request this, you can safely ignore this email.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background: #f3f4f6; padding: 20px; text-align: center; color: #6b7280; font-size: 12px;">
            &copy; ${new Date().getFullYear()} TraineeMind. All rights reserved.
          </td>
        </tr>
      </table>
    </body>
  </html>
    `;

    // Send email
    await sendEmail(
      user.email,
      "Password Reset Link from Administrator - TraineeMind",
      html
    );

    res.json({
      message: "Password reset link sent to user's email.",
      expiresAt: new Date(Date.now() + 3600000),
      // Only return in development for testing
      ...(process.env.NODE_ENV === "development" && {
        resetUrl,
        resetToken,
        hashedToken,
      }),
    });
  } catch (error) {
    console.error("Error sending reset link:", error);
    res.status(500).json({ error: "Failed to send reset link" });
  }
};

// Optional: Get reset link status
export const getResetLinkStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const hasActiveResetLink =
      user.resetPasswordToken && user.resetPasswordExpires > Date.now();

    res.json({
      hasActiveResetLink,
      expiresAt: user.resetPasswordExpires,
      isExpired: user.resetPasswordExpires <= Date.now(),
    });
  } catch (error) {
    console.error("Error getting reset link status:", error);
    res.status(500).json({ error: "Failed to get reset link status" });
  }
};
