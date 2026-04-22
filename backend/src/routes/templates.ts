import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../prisma';
import { authMiddleware, AuthRequest } from '../utils/auth';
import crypto from 'crypto';
import { workflowTemplates } from '../data/templates';
import logger from '../utils/logger';

const router = Router();

// List all templates
router.get('/', authMiddleware, async (req, res) => {
  try {
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

    res.json({ success: true, data: templates });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create workflow from template
router.post('/:id/create', authMiddleware, [
  body('name').optional().trim().isLength({ max: 100 }).withMessage('Name must be ≤ 100 characters'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Description must be ≤ 500 characters')
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
    }

    const template = (workflowTemplates as any)[req.params.id];

    if (!template) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }

    const { name, description } = req.body;

    // Transform nodes - remove template IDs and ensure proper format
    const nodes = template.nodes.map((node: any) => ({
      id: crypto.randomUUID(),
      type: node.type,
      name: node.name,
      description: node.description || null,
      position: node.position,
      parameters: node.parameters || {}
    }));

    // Transform connections - use new node IDs
    const nodeIdMap = new Map(template.nodes.map((n: any, i: number) => [n.id, nodes[i].id]));
    const connections = template.connections.map((conn: any) => ({
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
      return res.status(401).json({
        success: false,
        error: 'User not found. Please log out and log in again.'
      });
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

    res.json({ success: true, data: workflow });
  } catch (error: any) {
    logger.error('Template creation error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get template categories - MUST be before /:id route
router.get('/categories/list', authMiddleware, async (req, res) => {
  try {
    const categories = [...new Set(Object.values(workflowTemplates).map((t: any) => t.category))];
    res.json({ success: true, data: categories });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get single template - MUST be after specific routes
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const template = (workflowTemplates as any)[req.params.id];

    if (!template) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }

    res.json({
      success: true,
      data: {
        id: req.params.id,
        ...template
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
