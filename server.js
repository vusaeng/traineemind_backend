// src/server.js
import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import app from "./app.js";


const port = process.env.PORT || 4000;

// Top‑level await is supported in ESM
try {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ Connected to MongoDB");

  app.listen(port, () => {
    console.log(`🚀 Server running on http://localhost:${port}`);
  });
} catch (err) {
  console.error("❌ Failed to connect to MongoDB", err);
  process.exit(1);
}
