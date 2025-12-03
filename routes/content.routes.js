import { Router } from "express";
import * as ContentController from "../controllers/content.controller.public.js";

const router = Router();

// GET /api/content → list tutorials/articles/projects/blogs
router.get("/", ContentController.list);

// GET /api/content/:slug → get single content by slug
router.get("/:slug", ContentController.getBySlug);

export default router;
