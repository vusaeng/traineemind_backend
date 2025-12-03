import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String },
    parent: { type: mongoose.Schema.Types.ObjectId, ref: "Category" }
  },
  { timestamps: true }
);

// Index for faster lookups by slug
categorySchema.index({ slug: 1 });

export default mongoose.model("Category", categorySchema);
