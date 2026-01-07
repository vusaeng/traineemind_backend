import { Router } from "express";
import * as ContentController from "../controllers/content.controller.public.js";
import { checkCommentSpam } from "../middleware/checkCommentSpam.js";

const router = Router();

// GET /api/content → list tutorials/articles/projects/blogs
router.get("/", ContentController.list);

// GET /api/content/:slug → get single content by slug
router.get("/:slug", ContentController.getBySlug);

router.get("/categories", ContentController.listCategories);
router.get("/category", ContentController.listByCategory);

// router.post("/:slug/view", ContentController.incrementViewCount);

router.post("/:id/view", ContentController.trackBlogView);

// router.post("/:slug/comments", ContentController.commentsAdd);

router.get("/:slug/comments", ContentController.commentsList);

router.post("/:slug/comments", checkCommentSpam, ContentController.commentsAdd);

export default router;
