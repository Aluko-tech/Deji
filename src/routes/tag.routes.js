import express from "express";
import { authenticate } from "../middleware/auth.js";
import {
  createTag,
  listTags,
  deleteTag,
  assignTagsToContact,
} from "../controllers/tag.controller.js";

const router = express.Router();

// ✅ Create a new tag
router.post("/", authenticate, createTag);

// ✅ List all tags for tenant
router.get("/", authenticate, listTags);

// ❌ Delete a tag (optional, not yet implemented in your controller)
router.delete("/:id", authenticate, deleteTag);

// ❌ Assign tags to contact (optional, handled within contact controller usually)
router.post("/assign", authenticate, assignTagsToContact);

export default router;