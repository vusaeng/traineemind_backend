// src/routes/analytics.public.routes.js
import { Router } from "express";
import Content from "../models/Content.js";
import * as AnalyticsController from "../controllers/analytics.controller.js";

const router = Router();

router.get("/analytics/public-summary", async (req, res, next) => {
  try {
    const [videos, articles, projects, blogs] = await Promise.all([
      Content.countDocuments({ type: "video", isPublished: true }),
      Content.countDocuments({ type: "article", isPublished: true }),
      Content.countDocuments({ type: "project", isPublished: true }),
      Content.countDocuments({ type: "blog", isPublished: true }),
    ]);

    // Simple learners estimate (you can replace with real user stats later)
    const learnersEstimate = Math.max(videos + articles + projects + blogs, 10);

    res.json({
      videos,
      articles,
      projects,
      blogs,
      learners: learnersEstimate,
    });
  } catch (err) {
    next(err);
  }
});

router.get("/analytics/public-overview", AnalyticsController.overview);

export default router;
