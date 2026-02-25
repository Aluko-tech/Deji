import {
  createFormService,
  getFormsService,
  getFormByIdService,
  updateFormService,
  deleteFormService,
  submitFormService,
  getFormSubmissionsService,
  markSubmissionAsReadService,
  getFormAnalyticsService,
  publishFormService,
} from '../services/form.service.js';
import { logAudit } from '../services/auditLog.service.js';

/**
 * Create a new form
 */
export const createForm = async (req, res) => {
  try {
    const form = await createFormService(req.tenantId, req.body);

    await logAudit({
      tenantId: req.tenantId,
      userId: req.userId,
      model: 'Form',
      modelId: form.id,
      action: 'CREATE',
      changes: { created: form },
    });

    res.status(201).json({
      success: true,
      message: 'Form created successfully',
      data: form,
    });
  } catch (error) {
    console.error('Error creating form:', error.message);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to create form',
    });
  }
};

/**
 * Get all forms
 */
export const getForms = async (req, res) => {
  try {
    const forms = await getFormsService(req.tenantId, req.query);
    res.json({
      success: true,
      message: 'Forms fetched successfully',
      data: forms,
    });
  } catch (error) {
    console.error('Error fetching forms:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch forms',
    });
  }
};

/**
 * Get form by ID
 */
export const getFormById = async (req, res) => {
  try {
    const form = await getFormByIdService(req.tenantId, req.params.id);
    res.json({
      success: true,
      message: 'Form fetched successfully',
      data: form,
    });
  } catch (error) {
    console.error('Error fetching form:', error.message);
    res.status(404).json({
      success: false,
      message: error.message || 'Form not found',
    });
  }
};

/**
 * Update a form
 */
export const updateForm = async (req, res) => {
  try {
    const form = await updateFormService(req.tenantId, req.params.id, req.body);

    await logAudit({
      tenantId: req.tenantId,
      userId: req.userId,
      model: 'Form',
      modelId: form.id,
      action: 'UPDATE',
      changes: { updated: req.body },
    });

    res.json({
      success: true,
      message: 'Form updated successfully',
      data: form,
    });
  } catch (error) {
    console.error('Error updating form:', error.message);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to update form',
    });
  }
};

/**
 * Delete a form
 */
export const deleteForm = async (req, res) => {
  try {
    const result = await deleteFormService(req.tenantId, req.params.id);

    await logAudit({
      tenantId: req.tenantId,
      userId: req.userId,
      model: 'Form',
      modelId: req.params.id,
      action: 'DELETE',
      changes: { deleted: true },
    });

    res.json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (error) {
    console.error('Error deleting form:', error.message);
    res.status(404).json({
      success: false,
      message: error.message || 'Failed to delete form',
    });
  }
};

/**
 * Submit a form (public endpoint - no auth required)
 */
export const submitForm = async (req, res) => {
  try {
    const submission = await submitFormService(req.params.tenantId, req.params.formId, {
      data: req.body,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      source: req.headers.referer,
    });

    res.status(201).json({
      success: true,
      message: 'Form submission received',
      data: { submissionId: submission.id },
    });
  } catch (error) {
    console.error('Error submitting form:', error.message);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to submit form',
    });
  }
};

/**
 * Get form submissions
 */
export const getFormSubmissions = async (req, res) => {
  try {
    const submissions = await getFormSubmissionsService(req.tenantId, req.params.formId, req.query);
    res.json({
      success: true,
      message: 'Form submissions fetched successfully',
      data: submissions,
    });
  } catch (error) {
    console.error('Error fetching submissions:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch submissions',
    });
  }
};

/**
 * Mark submission as read
 */
export const markSubmissionAsRead = async (req, res) => {
  try {
    const submission = await markSubmissionAsReadService(req.tenantId, req.params.submissionId);
    res.json({
      success: true,
      message: 'Submission marked as read',
      data: submission,
    });
  } catch (error) {
    console.error('Error marking submission as read:', error.message);
    res.status(404).json({
      success: false,
      message: error.message || 'Failed to mark submission as read',
    });
  }
};

/**
 * Get form analytics
 */
export const getFormAnalytics = async (req, res) => {
  try {
    const analytics = await getFormAnalyticsService(req.tenantId, req.params.formId);
    res.json({
      success: true,
      message: 'Form analytics fetched successfully',
      data: analytics,
    });
  } catch (error) {
    console.error('Error fetching analytics:', error.message);
    res.status(404).json({
      success: false,
      message: error.message || 'Failed to fetch analytics',
    });
  }
};

/**
 * Publish/Unpublish a form
 */
export const publishForm = async (req, res) => {
  try {
    const { isPublished } = req.body;
    const form = await publishFormService(req.tenantId, req.params.id, isPublished);

    await logAudit({
      tenantId: req.tenantId,
      userId: req.userId,
      model: 'Form',
      modelId: form.id,
      action: 'UPDATE',
      changes: { isPublished },
    });

    res.json({
      success: true,
      message: `Form ${isPublished ? 'published' : 'unpublished'} successfully`,
      data: form,
    });
  } catch (error) {
    console.error('Error publishing form:', error.message);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to publish form',
    });
  }
};
