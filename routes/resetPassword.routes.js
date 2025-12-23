import express from "express";
import {
  requestPasswordReset,
  validateResetToken,
  resetPasswordWithToken,
} from "../controllers/resetPassword.controller.js";

const router = express.Router();

// Public routes - no auth required
router.post("/request", requestPasswordReset);
router.get("/validate/:token", validateResetToken);
router.post("/reset/:token", resetPasswordWithToken);

export default router;
