// src/routes/contact.routes.js
import express from "express";
import { authenticate } from "../middleware/auth.js";
import {
  createContact,
  getContacts,
  updateContact,
  deleteContact,
  getContactById,
  searchContacts,
  getPaginatedContacts,
  getContactsByTag,  
  suggestTags     
} from "../controllers/contact.controller.js";
import { enforceLimit } from '../middleware/planLimit.middleware.js';

const router = express.Router();

// Create contact with plan limit enforcement
router.post(
  "/contacts",
  authenticate,
  enforceLimit('contactsMax'),  // 👈 enforce plan limit here
  createContact
);

// Contact endpoints
router.post("/", authenticate, enforceLimit('contactsMax'), createContact);
router.get("/", authenticate, getContacts);
router.get("/paginated", authenticate, getPaginatedContacts);
router.get("/search", authenticate, searchContacts);
router.get("/:id", authenticate, getContactById);
router.put("/:contactId", authenticate, updateContact);
router.delete("/:id", authenticate, deleteContact);
router.get("/by-tag/:tag", authenticate, getContactsByTag);

// Tag suggestions
router.get("/tags/suggest", authenticate, suggestTags);

export default router;
