// middleware/auth.js
import { verifyToken } from "../utils/jwt.js";
import User from "../models/User.js";

export default async function auth(req, res, next) {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ error: "Missing token" });
    }

    const payload = verifyToken(token);

    const user = await User.findById(payload.sub);

    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!user.isActive) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    console.log("✅ User authenticated:", {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    });

    req.user = {
      id: user._id.toString(),
      role: user.role,
      email: user.email,
    };

    next();
  } catch (err) {
    res.status(401).json({ error: "Unauthorized" });
  }
}
