// src/middleware/upload.js
import multer from "multer";
import path from "path";
import fs from "fs";

const uploadDir = path.join(process.cwd(), "uploads", "tmp");

// ensure upload tmp dir exists
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, uploadDir);
  },
  filename: function (_req, file, cb) {
    const ext = path.extname(file.originalname);
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`;
    cb(null, name);
  },
});

// file size limit optional (e.g., 5MB)
const limits = {
  fileSize: 5 * 1024 * 1024,
};

const fileFilter = (_req, file, cb) => {
  // accept images only
  if (/image\/(jpeg|png|webp|gif)/.test(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed."), false);
  }
};

const upload = multer({ storage, limits, fileFilter });

export default upload;
