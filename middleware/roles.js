// middleware/roles.js
export default function roles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      console.log("❌ No user in request");
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: "Forbidden",
        message: `Access denied. Required roles: ${allowedRoles.join(", ")}`,
        yourRole: req.user.role,
      });
    }

    next();
  };
}
