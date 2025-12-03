import mongoose from "mongoose";

const projectFileSchema = new mongoose.Schema(
  {
    content: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Content",
      required: true
    },
    filename: {
      type: String,
      required: true
    },
    url: {
      type: String,
      required: true
    }, // storage location (local or cloud)
    sizeBytes: {
      type: Number
    },
    mimeType: {
      type: String
    }
  },
  { timestamps: true }
);

export default mongoose.model("ProjectFile", projectFileSchema);
