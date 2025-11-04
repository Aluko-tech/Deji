// src/controllers/upload.controller.js
import fs from "fs";
import path from "path";
import cloudinary from "../utils/cloudinary.js";

export const uploadLogo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const provider = process.env.UPLOAD_PROVIDER || "cloudinary";

    if (provider === "cloudinary") {
      // upload to cloudinary
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "deji-api/logos",
        resource_type: "image",
      });

      // remove temp file
      try { fs.unlinkSync(req.file.path); } catch (e) {}

      return res.json({ url: result.secure_url });
    } else {
      // local provider: we serve /uploads static from express app root
      const destFolder = path.join(process.cwd(), "uploads", "logos");
      fs.mkdirSync(destFolder, { recursive: true });

      const destPath = path.join(destFolder, req.file.filename);
      fs.renameSync(req.file.path, destPath);

      const url = `/uploads/logos/${req.file.filename}`;
      return res.json({ url });
    }
  } catch (err) {
    console.error("Upload error:", err);
    // cleanup tmp file on error
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch (e) {}
    }
    res.status(500).json({ error: "Upload failed" });
  }
};
