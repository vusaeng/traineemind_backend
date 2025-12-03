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
    const user = await User.create({ email, passwordHash, name });
    const token = signAccessToken(user);

    // Send welcome email
    const html = welcomeTemplate(name);
    await sendEmail(
      user.email,
      "Welcome to TraineeMind 🎉",
      `Hi ${name}, welcome to TraineeMind!`,
      html
    );

    res.status(201).json({ token, user });
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    const token = signAccessToken(user);
    res.json({ token, user });
  } catch (err) {
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
