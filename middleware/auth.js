// middleware/auth.js
import { verifyToken } from "../utils/jwt.js";
import User from "../models/User.js";
import jwt from "jsonwebtoken";

export default async function auth(req, res, next) {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!token) {
      return res.status(401).json({ error: "Missing token" });
    }

    // Use either id or _id from token
    const userId = decoded._id || decoded.id;

    const payload = verifyToken(token);

    const user = await User.findById(payload.sub);

    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!user.isActive) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Convert to plain object and ensure _id exists
    const userObject = user.toObject ? user.toObject() : user;

    // Normalize the ID field - ensure _id is always present
    if (!userObject._id && userObject.id) {
      userObject._id = userObject.id;
    }

    // Remove the lowercase id if it exists to avoid confusion
    delete userObject.id;

    req.user = userObject;
    req.token = token;

    next();
  } catch (err) {
    console.error("Auth error:", err.message);

    if (err.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        error: "Invalid token",
      });
    }

    if (err.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        error: "Token expired",
      });
    }

    res.status(401).json({
      success: false,
      error: "Please authenticate",
    });
  }
}
