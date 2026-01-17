import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import User from "../models/User.js";
import Profile from "../models/Profile.js";
import { signAccessToken } from "../utils/jwt.js";
import sendEmail from "../utils/sendEmail.js"; // utility for sending emails
import {
  resetPasswordTemplate,
  welcomeTemplate,
} from "../utils/emailTemplates.js";

export async function register(req, res, next) {
  try {
    const { email, password, name } = req.body;

    const existing = await User.findOne({ email });
    if (existing)
      return res.status(409).json({ error: "Email already in use" });

    const passwordHash = await bcrypt.hash(password, 12);

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");

    const user = await User.create({
      email,
      passwordHash,
      name,
      role: "user",
      verified: false,
      isActive: false,
      verificationToken,
      verificationExpires: Date.now() + 24 * 60 * 60 * 1000, // 24h
    });

    // Create profile for user
    await Profile.create({
      user: user._id,
      // Default preferences will be set by schema
    });

    // Send verification email
    const verifyUrl = `${process.env.BACKEND_URL / "api/auth" || "http://localhost:4000/api/auth"}/verify-email/${verificationToken}`;
    const html = `
      <h2>Welcome to TraineeMind 🎉</h2>
      <p>Hi ${name}, thanks for registering!</p>
      <p>Please <a href="${verifyUrl}">click here</a> to verify and activate your email address.</p>
      <p>This link will expire in 24 hours.</p>
    `;

    await sendEmail(
      user.email,
      "Verify your email - TraineeMind",
      `Hi ${name}, please verify and activate your email by clicking this link: ${verifyUrl}`,
      html,
    );

    res.status(201).json({
      message:
        "Registration successful. Please check your email to verify and activate your account.",
    });
  } catch (err) {
    next(err);
  }
}

/** * Verify Email
 * GET /api/auth/verify-email/:token
 */

export async function verifyEmail(req, res, next) {
  try {
    const { token } = req.params;

    // Log token hash instead of full token in production
    if (process.env.NODE_ENV === "development") {
      console.log(`🔍 Verification attempt for token: ${token}`);
    }

    // Find user with matching token (constant-time lookup)
    const user = await User.findOne({
      verificationToken: token,
    });

    // Check if user exists and token is not expired
    if (!user || user.verificationExpires < Date.now()) {
      console.log("❌ Verification failed: invalid or expired token");
      return res.status(400).json({ error: "Invalid or expired token" });
    }

    // Check if already verified
    if (user.verified) {
      console.log("ℹ️ User already verified, redirecting...");
      res.set("Cache-Control", "no-store");
      return res.redirect(`${process.env.FRONTEND_URL}/verify-success`);
    }

    if (process.env.NODE_ENV === "development") {
      console.log("✅ User found:", {
        email: user.email,
        id: user._id,
        currentlyVerified: user.verified,
      });
    }

    // Update user verification status
    user.verified = true;
    user.isActive = true;
    user.verificationToken = null;
    user.verificationExpires = null;

    // Save the updated user
    await user.save();

    if (process.env.NODE_ENV === "development") {
      console.log("📝 Verification successful for user:", user._id);

      // Double-check with fresh query (development only)
      const freshUser = await User.findById(user._id);
      console.log("🔄 Fresh query check:", {
        verified: freshUser.verified,
        verificationToken: freshUser.verificationToken,
      });
    }

    // Support both API and browser flows
    if (req.query.format === "json") {
      return res.json({
        success: true,
        message: "Email verified successfully",
      });
    }

    // Redirect to frontend with no-cache header
    console.log("🎉 Verification successful, redirecting...");
    res.set("Cache-Control", "no-store");
    res.redirect(`${process.env.FRONTEND_URL}/verify-success`);
  } catch (err) {
    console.error("💥 Verification error:", err.message);
    next(err);
  }
}

/** * Login
 * POST /api/auth/login
 */

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    console.log(`🔑 Login attempt for: ${email}`);

    // 1. Find user by email
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      console.log("❌ User not found");
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // 2. Check password
    const ok = await bcrypt.compare(password, user.passwordHash);
    console.log(ok);

    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    // 3. Check if user is active

    if (!user.isActive) {
      return res.status(403).json({
        error: "Account is deactivated",
      });
    }

    // 4. Check verification status
    console.log(`📋 Verification status for ${email}:`, {
      verified: user.verified,
      hasToken: !!user.verificationToken,
      user_id: user._id,
    });

    if (!user.verified) {
      console.log("❌ User not verified, blocking login");
      return res.status(403).json({
        error: "Please verify your email before logging in.",
      });
    }

    // Update login stats
    user.loginCount = (user.loginCount || 0) + 1;
    user.lastLogin = new Date();
    user.lastActivity = new Date();
    await user.save();

    // 5 Generate JWT with sub + role
    const token = jwt.sign(
      {
        sub: user._id.toString(), // subject claim = user ID
        role: user.role, // role claim = "admin" or "user"
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // 6 Get user profile
    const profile = await Profile.findOne({ user: user._id })
      .select("avatar bio stats")
      .lean();

    console.log(`✅ Login successful for: ${email}`);

    // Return response
    res.json({
      sucess: true,
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        verified: user.verified,
        createdAt: user.createdAt,
        avatar: profile?.avatar || "",
        bio: profile?.bio || "",
      },
      profile: profile || {
        stats: {
          totalLearningTime: 0,
          tutorialsCompleted: 0,
          tutorialsInProgress: 0,
          streak: { current: 0, longest: 0 },
          points: 0,
          level: 1,
        },
      },
    });
  } catch (err) {
    console.error("💥 Login error:", err);
    next(err);
  }
}

/**
 * Forgot Password
 * POST /api/auth/forgot-password
 */
export async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      // Always respond with success to avoid leaking which emails exist
      return res.json({
        message: "If this email exists, a reset link has been sent.",
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenHash = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    // Save token + expiry on user
    user.resetPasswordToken = resetTokenHash;
    user.resetPasswordExpires = Date.now() + 1000 * 60 * 15; // 15 minutes
    await user.save();

    // Build reset URL for frontend
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    // Send email
    const html = resetPasswordTemplate(resetUrl);
    await sendEmail(
      user.email,
      "Password Reset Request",
      `Click here to reset your password: ${resetUrl}`,
      html,
    );

    res.json({ message: "Reset link sent to your email." });
  } catch (err) {
    next(err);
  }
}

/**
 * Reset Password
 * POST /api/auth/reset-password
 */
export async function resetPassword(req, res, next) {
  try {
    const { token, password } = req.body;

    const resetTokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");
    const user = await User.findOne({
      resetPasswordToken: resetTokenHash,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user)
      return res.status(400).json({ error: "Invalid or expired token" });

    user.passwordHash = await bcrypt.hash(password, 12);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: "Password reset successful" });
  } catch (err) {
    next(err);
  }
}

// Add to auth.controller.js for debugging
export const debugLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select("+password"); // Include password field
    if (!user) {
      return res.json({ error: "User not found", email });
    }

    // Log password info (for debugging only - remove in production)
    console.log("Debug Login:", {
      email,
      providedPassword: password,
      storedPassword: user.password,
      passwordStartsWith: user.password.substring(0, 20),
      passwordLength: user.password.length,
      isBcryptHash: user.password.startsWith("$2b$"),
    });

    // Try direct bcrypt compare
    const isMatch = await bcrypt.compare(password, user.password);

    res.json({
      userFound: true,
      userId: user._id,
      email: user.email,
      passwordMatch: isMatch,
      passwordHashPreview: user.password.substring(0, 30),
      hashAlgorithm: user.password.substring(0, 4), // Should be "$2b$" for bcrypt
    });
  } catch (error) {
    console.error("Debug login error:", error);
    res.status(500).json({ error: error.message });
  }
};
