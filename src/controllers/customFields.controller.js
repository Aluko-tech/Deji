import {
  listCustomFields,
  getCustomFieldById,
  createCustomField,
  updateCustomField,
  deleteCustomField,
  getCustomFieldValues,
  upsertCustomFieldValue,
} from '../services/customFields.service.js';

/**
 * GET /custom-fields/:entity
 * List all custom fields for a tenant and entity
 */
export async function getCustomFields(req, res) {
  try {
    const tenantId = req.user.tenantId;
    const entity = req.params.entity;
    const fields = await listCustomFields(tenantId, entity);
    res.json(fields);
  } catch (error) {
    console.error('Failed to get custom fields:', error);
    res.status(500).json({ error: 'Failed to get custom fields' });
  }
}

/**
 * POST /custom-fields/:entity
 * Create a custom field
 */
export async function addCustomField(req, res) {
  try {
    const tenantId = req.user.tenantId;
    const entity = req.params.entity;
    const data = req.body;
    // validate required fields: name, type
    if (!data.name || !data.type) {
      return res.status(400).json({ error: 'Name and type are required' });
    }
    const created = await createCustomField(tenantId, entity, data);
    res.status(201).json(created);
  } catch (error) {
    console.error('Failed to create custom field:', error);
    res.status(500).json({ error: 'Failed to create custom field' });
  }
}

/**
 * PUT /custom-fields/:entity/:id
 * Update a custom field
 */
export async function editCustomField(req, res) {
  try {
    const tenantId = req.user.tenantId;
    const id = req.params.id;
    const data = req.body;
    const updated = await updateCustomField(tenantId, id, data);
    if (updated.count === 0) {
      return res.status(404).json({ error: 'Custom field not found or not updated' });
    }
    res.json({ message: 'Custom field updated' });
  } catch (error) {
    console.error('Failed to update custom field:', error);
    res.status(500).json({ error: 'Failed to update custom field' });
  }
}

/**
 * DELETE /custom-fields/:entity/:id
 * Delete a custom field
 */
export async function removeCustomField(req, res) {
  try {
    const tenantId = req.user.tenantId;
    const id = req.params.id;
    const deleted = await deleteCustomField(tenantId, id);
    if (deleted.count === 0) {
      return res.status(404).json({ error: 'Custom field not found or not deleted' });
    }
    res.json({ message: 'Custom field deleted' });
  } catch (error) {
    console.error('Failed to delete custom field:', error);
    res.status(500).json({ error: 'Failed to delete custom field' });
  }
}

/**
 * GET /custom-fields/values/:entityId
 * Get custom field values for a specific entity record (e.g. contact id)
 */
export async function getFieldValues(req, res) {
  try {
    const tenantId = req.user.tenantId;
    const entityId = req.params.entityId;
    const values = await getCustomFieldValues(tenantId, entityId);
    res.json(values);
  } catch (error) {
    console.error('Failed to get custom field values:', error);
    res.status(500).json({ error: 'Failed to get custom field values' });
  }
}

/**
 * POST /custom-fields/values/:entityId
 * Upsert custom field values for a record.
 * Expect body to be an array of { customFieldId, value }
 */
export async function upsertFieldValues(req, res) {
  try {
    const tenantId = req.user.tenantId;
    const entityId = req.params.entityId;
    const values = req.body; // array

    if (!Array.isArray(values)) {
      return res.status(400).json({ error: 'Body must be an array of { customFieldId, value }' });
    }

    const results = [];
    for (const { customFieldId, value } of values) {
      const updated = await upsertCustomFieldValue(tenantId, entityId, customFieldId, value);
      results.push(updated);
    }

    res.json({ message: 'Custom field values saved', results });
  } catch (error) {
    console.error('Failed to upsert custom field values:', error);
    res.status(500).json({ error: 'Failed to upsert custom field values' });
  }
}
