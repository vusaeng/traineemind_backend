// src/app.js
import path from "path";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import achievementRoutes from "./routes/achievement.routes.js";
import profileRoutes from "./routes/profile.routes.js";
import categoriesRoutes from "./routes/categories.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import contentRoutes from "./routes/content.routes.js";
import analyticsPublicRoutes from "./routes/analytics.public.routes.js";
import resetPasswordRoutes from "./routes/resetPassword.routes.js";
import tutorialRoutes from "./routes/tutorial.routes.js";

const app = express();
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
app.use(helmet());
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

app.use("/api/categories", categoriesRoutes);
app.use("/api", analyticsPublicRoutes); // <-- public summary
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/users", userRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/achievements", achievementRoutes);
app.use("/api/tutorials", tutorialRoutes);
app.use("/api/content", contentRoutes);
app.use("/api/auth/reset-password", resetPasswordRoutes);

export default app;
