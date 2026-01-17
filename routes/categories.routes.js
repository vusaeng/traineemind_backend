// src/routes/categories.routes.js
import { Router } from "express";
import * as CategoriesController from "../controllers/categories.controller.js";

const router = Router();

// Public list
router.get("/", CategoriesController.list);

export default router;
