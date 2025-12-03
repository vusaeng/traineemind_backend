import mongoose from "mongoose";

const adminSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true, select: false }, // select: false hides password by default
  role: { type: String, enum: ["admin", "superadmin", "advisor", "support"], default: "admin" },
  isActive: { type: Boolean, default: false },
  lastLogin: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

export default mongoose.model("Admin", adminSchema);
