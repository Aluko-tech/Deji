// src/controllers/project.controller.js
import {
  createProjectService,
  getProjectsService,
  getProjectByIdService,
  updateProjectService,
  deleteProjectService,
} from '../services/project.service.js';
import { logAudit } from '../utils/auditLog.js';

/**
 * POST /projects
 * Create a new project
 */
export const createProject = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const data = { ...req.body, tenantId };

    const project = await createProjectService(data);

    await logAudit({
      tenantId,
      userId: req.user.id,
      action: 'CREATE_PROJECT',
      description: `Created project: ${project.name}`,
    });

    res.status(201).json(project);
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ message: 'Failed to create project' });
  }
};

/**
 * GET /projects
 * Get all projects (with optional filters, pagination, etc.)
 */
export const getProjects = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const filters = { ...req.query, tenantId };

    const projects = await getProjectsService(filters);
    res.status(200).json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ message: 'Failed to fetch projects' });
  }
};

/**
 * GET /projects/:id
 * Get a single project by ID
 */
export const getProjectById = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;

    const project = await getProjectByIdService(id, tenantId);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    res.status(200).json(project);
  } catch (error) {
    console.error('Error fetching project by ID:', error);
    res.status(500).json({ message: 'Failed to fetch project' });
  }
};

/**
 * PUT /projects/:id
 * Update a project by ID
 */
export const updateProject = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;

    const updatedProject = await updateProjectService(id, tenantId, req.body);

    if (!updatedProject) {
      return res.status(404).json({ message: 'Project not found' });
    }

    await logAudit({
      tenantId,
      userId: req.user.id,
      action: 'UPDATE_PROJECT',
      description: `Updated project: ${id}`,
    });

    res.status(200).json(updatedProject);
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ message: 'Failed to update project' });
  }
};

/**
 * DELETE /projects/:id
 * Delete a project by ID
 */
export const deleteProject = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;

    const deleted = await deleteProjectService(id, tenantId);

    if (!deleted) {
      return res.status(404).json({ message: 'Project not found' });
    }

    await logAudit({
      tenantId,
      userId: req.user.id,
      action: 'DELETE_PROJECT',
      description: `Deleted project: ${id}`,
    });

    res.status(200).json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ message: 'Failed to delete project' });
  }
};
