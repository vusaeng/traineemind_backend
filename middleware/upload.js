// src/middleware/upload.js
import multer from "multer";
import path from "path";

const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join("uploads/videos")),
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/\s+/g, "_");
    cb(null, Date.now() + "_" + safe);
  }
});

const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join("uploads/images")),
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/\s+/g, "_");
    cb(null, Date.now() + "_" + safe);
  }
});

const videoFilter = (req, file, cb) => {
  const allowed = ["video/mp4", "video/webm", "video/ogg"];
  cb(null, allowed.includes(file.mimetype));
};

const imageFilter = (req, file, cb) => {
  const allowed = ["image/png", "image/jpeg", "image/webp"];
  cb(null, allowed.includes(file.mimetype));
};

export const uploadVideo = multer({
  storage: videoStorage,
  fileFilter: videoFilter,
  limits: { fileSize: 2 * 1024 * 1024 * 1024 } // 2GB
});

export const uploadImage = multer({
  storage: imageStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});
