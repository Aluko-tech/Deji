// src/controllers/upload.controller.js
import fs from "fs";
import path from "path";
import cloudinary from "../utils/cloudinary.js";

async function uploadFile(req, res, folder, localSubdir) {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const provider = process.env.UPLOAD_PROVIDER || "cloudinary";

    if (provider === "cloudinary") {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: `deji-api/${folder}`,
        resource_type: "image",
      });
      try { fs.unlinkSync(req.file.path); } catch {}
      return res.json({ url: result.secure_url });
    } else {
      const destFolder = path.join(process.cwd(), "uploads", localSubdir);
      fs.mkdirSync(destFolder, { recursive: true });
      const destPath = path.join(destFolder, req.file.filename);
      fs.renameSync(req.file.path, destPath);
      return res.json({ url: `/uploads/${localSubdir}/${req.file.filename}` });
    }
  } catch (err) {
    console.error("Upload error:", err);
    if (req.file?.path && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch {}
    }
    res.status(500).json({ error: "Upload failed" });
  }
}

export const uploadLogo  = (req, res) => uploadFile(req, res, "logos",    "logos");
export const uploadImage = (req, res) => uploadFile(req, res, "products",  "products");
