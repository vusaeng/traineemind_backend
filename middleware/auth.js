import { verifyToken } from "../utils/jwt.js";
import User from "../models/User.js";

export default async function auth(req, res, next) {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Missing token" });

    const payload = verifyToken(token);
    const user = await User.findById(payload.sub);
    if (!user || !user.isActive) return res.status(401).json({ error: "Unauthorized" });

    req.user = { id: user._id.toString(), role: user.role };
    next();
  } catch {
    res.status(401).json({ error: "Unauthorized" });
  }
}
