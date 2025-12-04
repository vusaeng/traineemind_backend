import { Router } from "express";
import * as AuthController from "../controllers/auth.controller.js";

const router = Router();

router.post("/register", AuthController.register);
router.get("/verify-email/:token", AuthController.verifyEmail);
router.post("/login", AuthController.login);
router.post("/forgot-password", AuthController.forgotPassword);
router.post("/reset-password", AuthController.resetPassword);

export default router;
