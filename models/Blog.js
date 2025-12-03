import mongoose from "mongoose";

// Utility to generate slugs
function generateSlug(title) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "") // remove special chars
    .replace(/\s+/g, "-")         // replace spaces with hyphens
    .replace(/-+/g, "-");         // collapse multiple hyphens
}

const blogSchema = new mongoose.Schema({
  title: { type: String, required: true },
  slug: { type: String, unique: true },
  image: { type: String },
  content: { type: String, required: true },
  author: { type: String, required: true },
  viewCount: { type: Number, default: 0 },
  viewDates: [{ type: Date, default: Date.now }],

  // Keeping your explicit date field (string) for display purposes
  date: { type: Date, default: Date.now, required: true },

  tags: { type: [String], default: [] },

  // ✅ New status field for lifecycle management
  status: {
    type: String,
    enum: ["draft", "published", "archived", "scheduled"],
    default: "draft",
  },

  // ✅ Optional publish date for scheduling
  publishDate: {
    type: Date,
  }
}, { timestamps: true });


// Auto-generate slug before validation
blogSchema.pre("validate", async function (next) {
  if (!this.slug && this.title) {
    this.slug = generateSlug(this.title);
  }

  // Check if slug already exists
  const existingBlog = await mongoose.models.Blog.findOne({ slug: this.slug });
  if (existingBlog && existingBlog._id.toString() !== this._id.toString()) {
    return next(new Error("A blog with this slug already exists"));
  }

  next();
});

export default mongoose.model("Blog", blogSchema);
