import express from 'express';
import {
  getCustomFields,
  addCustomField,
  editCustomField,
  removeCustomField,
  getFieldValues,
  upsertFieldValues,
} from '../controllers/customFields.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Manage custom fields for an entity (admin only)
router.get('/:entity', authorize(['admin']), getCustomFields);
router.post('/:entity', authorize(['admin']), addCustomField);
router.put('/:entity/:id', authorize(['admin']), editCustomField);
router.delete('/:entity/:id', authorize(['admin']), removeCustomField);

// Manage custom field values for a record (entity id)
// Regular users can update their own records; authorization logic can be adjusted
router.get('/values/:entityId', getFieldValues);
router.post('/values/:entityId', upsertFieldValues);

export default router;
