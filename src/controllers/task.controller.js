// src/controllers/task.controller.js
import { PrismaClient } from "@prisma/client";
import { logAction } from "../utils/auditLog.js";

const prisma = new PrismaClient();

// ✅ CREATE TASK
export const createTask = async (req, res) => {
  const { title, description, status, priority, dueDate, assignedToId, projectId } = req.body;
  const { tenantId, userId } = req.user;

  if (!title) return res.status(400).json({ message: "Task title is required." });

  try {
    const task = await prisma.task.create({
      data: {
        title,
        description,
        status,
        priority,
        dueDate,
        assignedToId,
        projectId,
        tenantId,
      },
    });

    await logAction({
      tenantId,
      userId,
      action: "CREATE_TASK",
      details: `Created task: ${title}`
    });

    res.status(201).json({ message: "Task created successfully.", task });
  } catch (err) {
    console.error("❌ Create Task Error:", err);
    res.status(500).json({ message: "Internal server error." });
  }
};

// ✅ GET TASKS (filters + pagination)
export const getTasks = async (req, res) => {
  const { tenantId } = req.user;
  const { status, search, skip = 0, take = 20 } = req.query;

  try {
    const tasks = await prisma.task.findMany({
      where: {
        tenantId,
        status: status || undefined,
        OR: search
          ? [{ title: { contains: search, mode: "insensitive" } }]
          : undefined,
      },
      skip: Number(skip),
      take: Number(take),
      orderBy: { createdAt: "desc" },
      include: { assignedTo: true, project: true },
    });

    res.status(200).json({ tasks });
  } catch (err) {
    console.error("❌ Get Tasks Error:", err);
    res.status(500).json({ message: "Internal server error." });
  }
};

// ✅ UPDATE TASK
export const updateTask = async (req, res) => {
  const { id } = req.params;
  const { tenantId, userId } = req.user;
  const updates = req.body;

  try {
    const task = await prisma.task.findUnique({ where: { id } });

    if (!task || task.tenantId !== tenantId) {
      return res.status(404).json({ message: "Task not found or access denied." });
    }

    const updated = await prisma.task.update({
      where: { id },
      data: updates,
    });

    await logAction({
      tenantId,
      userId,
      action: "UPDATE_TASK",
      details: `Updated task #${id}`
    });

    res.status(200).json({ message: "Task updated.", task: updated });
  } catch (err) {
    console.error("❌ Update Task Error:", err);
    res.status(500).json({ message: "Internal server error." });
  }
};

// ✅ DELETE TASK
export const deleteTask = async (req, res) => {
  const { id } = req.params;
  const { tenantId, userId } = req.user;

  try {
    const task = await prisma.task.findUnique({ where: { id } });

    if (!task || task.tenantId !== tenantId) {
      return res.status(404).json({ message: "Task not found or access denied." });
    }

    await prisma.task.delete({ where: { id } });

    await logAction({
      tenantId,
      userId,
      action: "DELETE_TASK",
      details: `Deleted task #${id}`
    });

    res.status(200).json({ message: "Task deleted successfully." });
  } catch (err) {
    console.error("❌ Delete Task Error:", err);
    res.status(500).json({ message: "Internal server error." });
  }
};
