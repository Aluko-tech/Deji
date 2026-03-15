import prisma from '../config/prisma.js';

/**
 * Create a new form
 */
export async function createFormService(tenantId, data) {
  const { name, title, description, formType = 'LEAD_CAPTURE', fields = [] } = data;

  if (!name || !title) {
    throw new Error('Form name and title are required.');
  }

  const form = await prisma.form.create({
    data: {
      tenantId,
      name,
      title,
      description,
      formType,
      fields: {
        create: fields.map((field, index) => ({
          fieldName: field.fieldName,
          label: field.label,
          placeholder: field.placeholder,
          fieldType: field.fieldType,
          isRequired: field.isRequired || false,
          validationRules: field.validationRules || null,
          options: field.options || null,
          order: index,
        })),
      },
    },
    include: { fields: true },
  });

  return form;
}

/**
 * Get all forms for a tenant
 */
export async function getFormsService(tenantId, query = {}) {
  const page = Math.max(1, Number(query.page || 1));
  const limit = Math.min(100, Math.max(1, Number(query.limit || 20)));
  const skip = (page - 1) * limit;

  const where = {
    tenantId,
    ...(query.formType ? { formType: query.formType } : {}),
    ...(query.isPublished !== undefined ? { isPublished: query.isPublished === 'true' } : {}),
  };

  const [data, total] = await prisma.$transaction([
    prisma.form.findMany({
      where,
      include: { fields: { orderBy: { order: 'asc' } } },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.form.count({ where }),
  ]);

  return {
    data,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
  };
}

/**
 * Get form by ID
 */
export async function getFormByIdService(tenantId, formId) {
  const form = await prisma.form.findFirst({
    where: { id: formId, tenantId },
    include: {
      fields: { orderBy: { order: 'asc' } },
      submissions: { orderBy: { createdAt: 'desc' }, take: 10 },
    },
  });

  if (!form) throw new Error('Form not found.');
  return form;
}

/**
 * Update a form
 */
export async function updateFormService(tenantId, formId, data) {
  const { fields, ...formData } = data;

  const form = await prisma.form.update({
    where: { id: formId },
    data: {
      ...formData,
      ...(fields && {
        fields: {
          deleteMany: {},
          create: fields.map((field, index) => ({
            fieldName: field.fieldName,
            label: field.label,
            placeholder: field.placeholder,
            fieldType: field.fieldType,
            isRequired: field.isRequired || false,
            validationRules: field.validationRules || null,
            options: field.options || null,
            order: index,
          })),
        },
      }),
    },
    include: { fields: { orderBy: { order: 'asc' } } },
  });

  return form;
}

/**
 * Delete a form
 */
export async function deleteFormService(tenantId, formId) {
  const form = await prisma.form.findFirst({
    where: { id: formId, tenantId },
  });

  if (!form) throw new Error('Form not found.');

  await prisma.form.delete({ where: { id: formId } });
  return { id: formId, message: 'Form deleted successfully.' };
}

/**
 * Submit a form
 */
export async function submitFormService(tenantId, formId, submissionData) {
  const form = await prisma.form.findFirst({
    where: { id: formId, tenantId, isPublished: true },
    include: { fields: true },
  });

  if (!form) throw new Error('Form not found or not published.');

  // Extract email, phone, name if available
  const data = submissionData.data || {};
  const email = data.email || submissionData.email;
  const phone = data.phone || submissionData.phone;
  const name = data.name || submissionData.name;

  const submission = await prisma.formSubmission.create({
    data: {
      formId,
      tenantId,
      data,
      email,
      phone,
      name,
      ipAddress: submissionData.ipAddress,
      userAgent: submissionData.userAgent,
      source: submissionData.source,
    },
  });

  // Increment submission count
  await prisma.form.update({
    where: { id: formId },
    data: { submissionCount: { increment: 1 } },
  });

  // ── Upsert Contact (email is not @unique on Contact — must scope by tenantId) ──
  if (email) {
    const existingContact = await prisma.contact.findFirst({
      where: { tenantId, email },
    });
    if (!existingContact) {
      await prisma.contact.create({
        data: {
          tenantId,
          email,
          name: name || email,
          phone: phone || undefined,
          type: 'customer',
        },
      });
    } else if (phone && !existingContact.phone) {
      await prisma.contact.update({
        where: { id: existingContact.id },
        data: { phone },
      });
    }
  }

  // ── Auto-create Lead in CRM ──────────────────────────────────────────────────
  // If email present: upsert so re-submissions don't duplicate the lead.
  // If no email (name/phone only): always create — no unique key to dedupe on.
  if (name || email || phone) {
    if (email) {
      await prisma.lead.upsert({
        where: { tenantId_email: { tenantId, email } },
        update: {
          ...(phone ? { phone } : {}),
          lastContactedAt: new Date(),
        },
        create: {
          tenantId,
          name:     name || email,
          email,
          phone:    phone || undefined,
          source:   'form_submission',
          formId,
          formName: form.name,
          status:   'new',
          leadType: 'warm',
          priority: 'medium',
        },
      });
    } else {
      await prisma.lead.create({
        data: {
          tenantId,
          name:     name || phone || 'Unknown',
          phone:    phone || undefined,
          source:   'form_submission',
          formId,
          formName: form.name,
          status:   'new',
          leadType: 'warm',
          priority: 'medium',
        },
      });
    }
  }

  return submission;
}

/**
 * Get form submissions
 */
export async function getFormSubmissionsService(tenantId, formId, query = {}) {
  const page = Math.max(1, Number(query.page || 1));
  const limit = Math.min(100, Math.max(1, Number(query.limit || 50)));
  const skip = (page - 1) * limit;

  const where = {
    tenantId,
    formId,
  };

  const [data, total] = await prisma.$transaction([
    prisma.formSubmission.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.formSubmission.count({ where }),
  ]);

  return {
    data,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
  };
}

/**
 * Mark submission as read
 */
export async function markSubmissionAsReadService(tenantId, submissionId) {
  const submission = await prisma.formSubmission.findFirst({
    where: { id: submissionId, tenantId },
  });

  if (!submission) throw new Error('Submission not found.');

  return await prisma.formSubmission.update({
    where: { id: submissionId },
    data: { isRead: true },
  });
}

/**
 * Get form analytics
 */
export async function getFormAnalyticsService(tenantId, formId) {
  const form = await prisma.form.findFirst({
    where: { id: formId, tenantId },
  });

  if (!form) throw new Error('Form not found.');

  const submissions = await prisma.formSubmission.findMany({
    where: { formId, tenantId },
  });

  const unreadCount = submissions.filter(s => !s.isRead).length;

  return {
    formId,
    viewCount: form.viewCount,
    submissionCount: form.submissionCount,
    totalSubmissions: submissions.length,
    unreadSubmissions: unreadCount,
    conversionRate: form.viewCount > 0 ? ((form.submissionCount / form.viewCount) * 100).toFixed(2) : 0,
    submissions: submissions.slice(0, 10),
  };
}

/**
 * Publish/Unpublish a form
 */
export async function publishFormService(tenantId, formId, isPublished) {
  const form = await prisma.form.update({
    where: { id: formId },
    data: { isPublished },
  });

  return form;
}
