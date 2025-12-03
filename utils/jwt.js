import jwt from "jsonwebtoken";

export function signAccessToken(user) {
  return jwt.sign({ sub: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "1h" });
}

export function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}
