import prisma from '../config/prisma.js';
import { Parser } from 'json2csv';
import { logAudit } from '../utils/auditLog.js';

// CREATE contact
export const createContact = async (req, res) => {
  try {
    const { name, email, phone, tags = [] } = req.body;
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;

    if (!tenantId) return res.status(401).json({ message: 'Missing tenant context.' });
    if (!name || !email) return res.status(400).json({ message: 'Name and email are required.' });

    const contact = await prisma.contact.create({
      data: {
        name,
        email,
        phone,
        tenantId,
        tags: {
          connectOrCreate: tags.map((tagName) => ({
            where: { name_tenantId: { name: tagName, tenantId } },
            create: { name: tagName, tenantId },
          })),
        },
      },
      include: { tags: true },
    });

    await logAudit(userId, tenantId, 'CREATE_CONTACT', { contactId: contact.id });

    return res.status(201).json({ message: 'Contact created successfully.', contact });
  } catch (err) {
    console.error('❌ Create Contact Error:', err);
    if (err.code === 'P2002') return res.status(409).json({ message: 'Email already exists.' });
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// GET all contacts
export const getContacts = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    if (!tenantId) return res.status(401).json({ message: 'Missing tenant context.' });

    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      prisma.contact.count({ where: { tenantId } }),
    ]);

    return res.status(200).json({ page, limit, total, totalPages: Math.ceil(total / limit), contacts });
  } catch (err) {
    console.error('❌ Get Contacts Error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// Paginated contacts & CSV export
export const getPaginatedContacts = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(401).json({ message: 'Missing tenant context.' });

    const {
      page = 1,
      limit = 10,
      query = '',
      sortBy = 'createdAt',
      sortOrder = 'desc',
      fromDate,
      toDate,
      fields,
      tag,
      exportFormat,
    } = req.query;

    const skip = (page - 1) * limit;
    const take = Number(limit);

    const where = {
      tenantId,
      AND: [
        {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
          ],
        },
        fromDate ? { createdAt: { gte: new Date(fromDate) } } : undefined,
        toDate ? { createdAt: { lte: new Date(toDate) } } : undefined,
        tag
          ? {
              tags: {
                some: { name: { equals: tag, mode: 'insensitive' } },
              },
            }
          : undefined,
      ].filter(Boolean),
    };

    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        take,
        skip,
        orderBy: { [sortBy]: sortOrder },
        select: fields ? Object.fromEntries(fields.split(',').map((f) => [f.trim(), true])) : undefined,
      }),
      prisma.contact.count({ where }),
    ]);

    if (exportFormat === 'csv') {
      const parser = new Parser({ fields: ['id', 'name', 'email', 'phone', 'createdAt'] });
      const csv = parser.parse(contacts);
      res.header('Content-Type', 'text/csv');
      res.attachment('contacts.csv');
      return res.send(csv);
    }

    return res.status(200).json({ contacts, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error('❌ Paginated Contact Fetch Error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// Get single contact
export const getContactById = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;
    const id = req.params.id;
    if (!tenantId) return res.status(401).json({ message: 'Missing tenant context.' });

    const contact = await prisma.contact.findFirst({ where: { id, tenantId }, include: { tags: true } });
    if (!contact) return res.status(404).json({ message: 'Contact not found.' });

    return res.status(200).json({ contact });
  } catch (err) {
    console.error('❌ Get Contact Error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// Search contacts
export const searchContacts = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;
    const q = req.query.query;
    if (!tenantId) return res.status(401).json({ message: 'Missing tenant context.' });
    if (!q) return res.status(400).json({ message: 'Search query is required.' });

    const contacts = await prisma.contact.findMany({
      where: {
        tenantId,
        OR: [{ name: { contains: q, mode: 'insensitive' } }, { email: { contains: q, mode: 'insensitive' } }],
      },
      take: 50,
    });

    return res.status(200).json({ contacts });
  } catch (err) {
    console.error('❌ Search Contacts Error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// Update contact
export const updateContact = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    const contactId = req.params.contactId;
    const { name, email, phone, tags = [] } = req.body;

    if (!tenantId) return res.status(401).json({ message: 'Missing tenant context.' });

    const existing = await prisma.contact.findFirst({ where: { id: contactId, tenantId } });
    if (!existing) return res.status(404).json({ message: 'Contact not found.' });

    const updated = await prisma.contact.update({
      where: { id: contactId },
      data: {
        name,
        email,
        phone,
        tags: {
          set: [],
          connectOrCreate: tags.map((tagName) => ({
            where: { name_tenantId: { name: tagName, tenantId } },
            create: { name: tagName, tenantId },
          })),
        },
      },
      include: { tags: true },
    });

    await logAudit(userId, tenantId, 'UPDATE_CONTACT', { contactId });
    return res.status(200).json({ message: 'Contact updated successfully.', contact: updated });
  } catch (err) {
    console.error('❌ Update Contact Error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// Delete contact
export const deleteContact = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    const id = req.params.id;

    if (!tenantId) return res.status(401).json({ message: 'Missing tenant context.' });

    const existing = await prisma.contact.findUnique({ where: { id } });
    if (!existing || existing.tenantId !== tenantId) return res.status(404).json({ message: 'Contact not found or access denied.' });

    await prisma.contact.delete({ where: { id } });
    await logAudit(userId, tenantId, 'DELETE_CONTACT', { contactId: id });

    return res.status(200).json({ message: 'Contact deleted successfully.' });
  } catch (err) {
    console.error('❌ Delete Contact Error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// Get contacts by tag
export const getContactsByTag = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;
    const tag = req.params.tag;
    if (!tenantId) return res.status(401).json({ message: 'Missing tenant context.' });

    const contacts = await prisma.contact.findMany({
      where: { tenantId, tags: { some: { name: { equals: tag, mode: 'insensitive' } } } },
      include: { tags: true },
    });

    return res.status(200).json({ contacts });
  } catch (err) {
    console.error('❌ Get Contacts by Tag Error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// Suggest tags
export const suggestTags = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;
    const q = req.query.q || '';
    if (!tenantId) return res.status(401).json({ message: 'Missing tenant context.' });

    const tags = await prisma.tag.findMany({
      where: { tenantId, name: { contains: q, mode: 'insensitive' } },
      orderBy: { name: 'asc' },
      take: 10,
    });

    return res.status(200).json({ tags });
  } catch (err) {
    console.error('❌ Suggest Tags Error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};
