import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ✅ CREATE tag
export const createTag = async (req, res) => {
  const { name } = req.body;
  const { tenantId } = req.user;

  if (!name) {
    return res.status(400).json({ message: "Tag name is required." });
  }

  try {
    const existing = await prisma.tag.findUnique({
      where: { name_tenantId: { name, tenantId } },
    });

    if (existing) {
      return res.status(409).json({ message: "Tag already exists." });
    }

    const tag = await prisma.tag.create({
      data: { name, tenantId },
    });

    res.status(201).json({ message: "Tag created successfully.", tag });
  } catch (error) {
    console.error("❌ Create Tag Error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

// ✅ LIST all tags for a tenant
export const listTags = async (req, res) => {
  const { tenantId } = req.user;

  try {
    const tags = await prisma.tag.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({ tags });
  } catch (error) {
    console.error("❌ List Tags Error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

// ✅ DELETE a tag
export const deleteTag = async (req, res) => {
  const { id } = req.params;
  const { tenantId } = req.user;

  try {
    const tag = await prisma.tag.findUnique({ where: { id } });

    if (!tag || tag.tenantId !== tenantId) {
      return res.status(404).json({ message: "Tag not found or access denied." });
    }

    await prisma.tag.delete({ where: { id } });

    res.status(200).json({ message: "Tag deleted successfully." });
  } catch (error) {
    console.error("❌ Delete Tag Error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

// ✅ ASSIGN tags to a contact
export const assignTagsToContact = async (req, res) => {
  const { contactId, tagIds } = req.body;
  const { tenantId } = req.user;

  if (!contactId || !Array.isArray(tagIds)) {
    return res.status(400).json({ message: "Contact ID and tag IDs are required." });
  }

  try {
    const contact = await prisma.contact.findFirst({
      where: { id: contactId, tenantId },
    });

    if (!contact) {
      return res.status(404).json({ message: "Contact not found." });
    }

    const updated = await prisma.contact.update({
      where: { id: contactId },
      data: {
        tags: {
          set: tagIds.map((id) => ({ id })),
        },
      },
      include: { tags: true },
    });

    res.status(200).json({
      message: "Tags assigned successfully.",
      contact: updated,
    });
  } catch (error) {
    console.error("❌ Assign Tags Error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

