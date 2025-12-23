import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true },
    role: { type: String, enum: ["admin", "user"], default: "user" },
    isActive: { type: Boolean, default: false },
    phone: { type: String },
    bio: { type: String },
    loginCount: { type: Number, default: 0 }, // Track login count
    lastLogin: { type: Date }, // Already exists in your model
    lastActivity: { type: Date }, // For tracking any activity
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
    passwordChangeRequired: { type: Boolean, default: false },
    verified: { type: Boolean, default: false },
    verificationToken: String,
    verificationExpires: Date,
    lastLogin: { type: Date },
  },
  { timestamps: true }
);

// Hash password before saving (for new users and password updates)
userSchema.pre("save", async function (next) {
  // Only hash the password if it's modified (or new)
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model("User", userSchema);
