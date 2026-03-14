import express from 'express';
import {
  createForm,
  getForms,
  getFormById,
  updateForm,
  deleteForm,
  submitForm,
  getFormSubmissions,
  markSubmissionAsRead,
  getFormAnalytics,
  publishForm,
} from '../controllers/form.controller.js';
import { enforceLimit } from '../middleware/planLimit.middleware.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// ✅ Protected routes (requires authentication)
router.post('/', authenticate, authorize(['admin', 'staff']), enforceLimit('formsMax'), createForm);
router.get('/', authenticate, getForms);
router.get('/:id', authenticate, getFormById);
router.put('/:id', authenticate, authorize(['admin', 'staff']), updateForm);
router.delete('/:id', authenticate, authorize(['admin']), deleteForm);
router.post('/:id/publish', authenticate, authorize(['admin', 'staff']), publishForm);

// Submissions
router.get('/:formId/submissions', authenticate, getFormSubmissions);
router.patch('/submissions/:submissionId/read', authenticate, markSubmissionAsRead);

// Analytics
router.get('/:formId/analytics', authenticate, getFormAnalytics);

// ✅ Public endpoint for form submission (no auth required)
router.post('/:tenantId/:formId/submit', submitForm);

export default router;
