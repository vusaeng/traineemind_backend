// src/app.js
import path from "path";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import authRoutes from "./routes/auth.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import contentRoutes from "./routes/content.routes.js";
import analyticsPublicRoutes from "./routes/analytics.public.routes.js";
import resetPasswordRoutes from "./routes/resetPassword.routes.js";

const app = express();
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
app.use(helmet());
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
//app.use("/admin", tutorialRoutes);
app.use("/api/content", contentRoutes);
app.use("/api", analyticsPublicRoutes); // <-- public summary
app.use("/api/auth/reset-password", resetPasswordRoutes);

export default app;
