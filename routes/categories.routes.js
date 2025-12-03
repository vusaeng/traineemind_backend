// src/routes/categories.routes.js
import { Router } from "express";
import * as CategoriesController from "../controllers/categories.controller.js";

const router = Router();

// Public list
router.get("/categories", CategoriesController.list);

// Admin CRUD (protected in admin.routes.js)
router.post("/admin/categories", CategoriesController.create);
router.patch("/admin/categories/:id", CategoriesController.update);
router.delete("/admin/categories/:id", CategoriesController.remove);

export default router;
