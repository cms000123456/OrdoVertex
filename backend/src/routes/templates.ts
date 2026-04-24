import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../prisma';
import { authMiddleware, AuthRequest } from '../utils/auth';
import crypto from 'crypto';
import { workflowTemplates } from '../data/templates';
import logger from '../utils/logger';
import { successResponse, errorResponse } from '../utils/response';
import { asyncHandler } from '../utils/async-handler';

const router = Router();

// List all templates
router.get('/', authMiddleware, asyncHandler(async (req, res) => {
  const { category, search } = req.query;

  let templates = Object.entries(workflowTemplates).map(([id, template]: [string, any]) => ({
    id,
    name: template.name,
    description: template.description,
    category: template.category,
    tags: template.tags
  }));

  // Filter by category
  if (category) {
    templates = templates.filter(t => t.category === category);
  }

  // Filter by search
  if (search) {
    const searchLower = (search as string).toLowerCase();
    templates = templates.filter(t =>
      t.name.toLowerCase().includes(searchLower) ||
      t.description.toLowerCase().includes(searchLower) ||
      t.tags.some((tag: string) => tag.toLowerCase().includes(searchLower))
    );
  }

  return successResponse(res, { templates });
}));

// Create workflow from template
router.post('/:id/create', authMiddleware, [
  body('name').optional().trim().isLength({ max: 100 }).withMessage('Name must be ≤ 100 characters'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Description must be ≤ 500 characters')
], asyncHandler(async (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return errorResponse(res, 'Validation failed', 400, errors.array());
  }

  const template = (workflowTemplates as any)[req.params.id];

  if (!template) {
    return errorResponse(res, 'Template not found', 404);
  }

  const { name, description } = req.body;

  // Transform nodes - remove template IDs and ensure proper format
  const nodes = template.nodes.map((node: { id?: string; type?: string; name?: string; description?: string; position?: { x: number; y: number }; parameters?: Record<string, unknown> }) => ({
    id: crypto.randomUUID(),
    type: node.type,
    name: node.name,
    description: node.description || null,
    position: node.position,
    parameters: node.parameters || {}
  }));

  // Transform connections - use new node IDs
  const nodeIdMap = new Map(template.nodes.map((n: { id?: string }, i: number) => [n.id, nodes[i].id]));
  const connections = template.connections.map((conn: { id?: string; source?: string; target?: string; sourceHandle?: string | null; targetHandle?: string | null }) => ({
    id: crypto.randomUUID(),
    source: nodeIdMap.get(conn.source) || conn.source,
    target: nodeIdMap.get(conn.target) || conn.target,
    sourceHandle: conn.sourceHandle || null,
    targetHandle: conn.targetHandle || null
  }));

  // Verify user exists before creating workflow
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { id: true }
  });

  if (!user) {
    return errorResponse(res, 'User not found. Please log out and log in again.', 401);
  }

  const workflow = await prisma.workflow.create({
    data: {
      name: name || template.name,
      description: description || template.description,
      nodes,
      connections,
      userId: req.user!.id,
      active: false
    }
  });

  return successResponse(res, { workflow });
}));

// Get template categories - MUST be before /:id route
router.get('/categories/list', authMiddleware, asyncHandler(async (req, res) => {
  const categories = [...new Set(Object.values(workflowTemplates).map((t: { category?: string }) => t.category))];
  return successResponse(res, { categories });
}));

// Get single template - MUST be after specific routes
router.get('/:id', authMiddleware, asyncHandler(async (req, res) => {
  const template = (workflowTemplates as any)[req.params.id];

  if (!template) {
    return errorResponse(res, 'Template not found', 404);
  }

  return successResponse(res, { id: req.params.id, ...template });
}));

export default router;