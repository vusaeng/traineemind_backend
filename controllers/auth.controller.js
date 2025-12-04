import bcrypt from "bcryptjs";
import crypto from "crypto";
import User from "../models/User.js";
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
      verified: false,
      verificationToken,
      verificationExpires: Date.now() + 24 * 60 * 60 * 1000, // 24h
    });

    // Send verification email
    const verifyUrl = `http://localhost:8081/verify-email/${verificationToken}`;
    const html = `
      <h2>Welcome to TraineeMind 🎉</h2>
      <p>Hi ${name}, thanks for registering!</p>
      <p>Please <a href="${verifyUrl}">click here</a> to verify your email address.</p>
      <p>This link will expire in 24 hours.</p>
    `;

    await sendEmail(
      user.email,
      "Verify your email - TraineeMind",
      `Hi ${name}, please verify your email by clicking this link: ${verifyUrl}`,
      html
    );

    res.status(201).json({
      message:
        "Registration successful. Please check your email to verify your account.",
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
    console.log(`🔍 Verification attempt for token: ${token}`);

    // Find user with valid token
    const user = await User.findOne({
      verificationToken: token,
      verificationExpires: { $gt: Date.now() },
    });

    if (!user) {
      console.log("❌ Verification failed: invalid or expired token");
      return res.status(400).json({ error: "Invalid or expired token" });
    }

    console.log("✅ User found:", {
      email: user.email,
      id: user._id,
      currentlyVerified: user.verified,
      verificationToken: user.verificationToken,
    });

    // Save the document directly instead of using updateOne
    user.verified = true;
    user.verificationToken = null;
    user.verificationExpires = null;

    // Save and log the result
    const savedUser = await user.save();

    console.log("📝 After save:", {
      verified: savedUser.verified,
      verificationToken: savedUser.verificationToken,
      _id: savedUser._id,
    });

    // Double-check with a fresh query
    const freshUser = await User.findById(user._id);
    console.log("🔄 Fresh query check:", {
      verified: freshUser.verified,
      verificationToken: freshUser.verificationToken,
    });

    // Redirect to frontend
    console.log("🎉 Verification successful, redirecting...");
    res.redirect(`${process.env.FRONTEND_URL}/verify-success`);
  } catch (err) {
    console.error("💥 Verification error:", err);
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

    // 1. Find user
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      console.log("❌ User not found");
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // 2. Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      console.log("❌ Password mismatch");
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // 3. Check verification status
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

    // 4. Generate token and login
    const token = generateToken(user._id);

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    console.log(`✅ Login successful for: ${email}`);

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        verified: user.verified, // Send this to frontend
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
      html
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
