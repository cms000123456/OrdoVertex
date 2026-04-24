import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { WorkspaceRole } from '@prisma/client';
import { prisma } from '../prisma';
import { authMiddleware, AuthRequest } from '../utils/auth';
import { successResponse, errorResponse, parsePagination, validateUUID, handleValidationErrors } from '../utils/response';
import logger from '../utils/logger';
import { asyncHandler } from '../utils/async-handler';
const authenticateToken = authMiddleware;

const router = Router();

// Helper to generate slug
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') + '-' + Date.now().toString(36);
}

// List user's workspaces
router.get('/', authenticateToken, asyncHandler(async (req, res) => {
  const { limit, offset } = parsePagination(req.query);
  const where = {
    OR: [
      { ownerId: req.user!.id },
      { members: { some: { userId: req.user!.id } } }
    ]
  };
  const [workspaces, total] = await Promise.all([
    prisma.workspace.findMany({
      where,
      include: {
        owner: {
          select: { id: true, name: true, email: true }
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true }
            }
          }
        },
        _count: {
          select: { workflows: true, members: true }
        }
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      skip: offset
    }),
    prisma.workspace.count({ where })
  ]);

  res.json({ success: true, data: workspaces, pagination: { total, limit, offset } });
}));

// Create workspace
router.post('/', authenticateToken, [
  body('name').trim().notEmpty().isLength({ max: 100 }).withMessage('Name is required and must be ≤ 100 characters'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Description must be ≤ 500 characters')
], asyncHandler(async (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return errorResponse(res, 'Validation failed', 400, errors.array());
  }

  const { name, description } = req.body;

  // Create workspace and owner membership atomically
  const workspace = await prisma.$transaction(async (tx) => {
    const ws = await tx.workspace.create({
      data: {
        name,
        description,
        slug: generateSlug(name),
        ownerId: req.user!.id
      }
    });
    await tx.workspaceMember.create({
      data: {
        workspaceId: ws.id,
        userId: req.user!.id,
        role: 'owner' as WorkspaceRole
      }
    });
    return ws;
  });

  // Re-fetch with relations for response
  const workspaceWithRelations = await prisma.workspace.findUnique({
    where: { id: workspace.id },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      members: { include: { user: { select: { id: true, name: true, email: true } } } }
    }
  });

  return successResponse(res, workspaceWithRelations, 201);
}));

// Get workspace by ID
router.get('/:id', validateUUID(), handleValidationErrors, authenticateToken, asyncHandler(async (req, res) => {
  const workspace = await prisma.workspace.findFirst({
    where: {
      id: req.params.id,
      OR: [
        { ownerId: req.user!.id },
        { members: { some: { userId: req.user!.id } } }
      ]
    },
    include: {
      owner: {
        select: { id: true, name: true, email: true }
      },
      members: {
        include: {
          user: {
            select: { id: true, name: true, email: true }
          }
        }
      },
      workflows: {
        select: {
          id: true,
          name: true,
          active: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { executions: true } }
        }
      },
      credentials: {
        where: { workspaceId: req.params.id },
        select: { id: true, name: true, type: true, createdAt: true }
      },
      _count: {
        select: { workflows: true, members: true }
      }
    }
  });

  if (!workspace) {
    return res.status(404).json({ success: false, error: 'Workspace not found' });
  }

  res.json({ success: true, data: workspace });
}));

// Update workspace
router.patch('/:id', validateUUID(), handleValidationErrors, authenticateToken, asyncHandler(async (req, res) => {
  const { name, description } = req.body;

  // Check permissions (only owner or admin can update)
  const member = await prisma.workspaceMember.findFirst({
    where: {
      workspaceId: req.params.id,
      userId: req.user!.id,
      role: { in: ['owner', 'admin'] }
    }
  });

  const isOwner = await prisma.workspace.findFirst({
    where: { id: req.params.id, ownerId: req.user!.id }
  });

  if (!member && !isOwner) {
    return res.status(403).json({ success: false, error: 'Insufficient permissions' });
  }

  const workspace = await prisma.workspace.update({
    where: { id: req.params.id },
    data: { name, description },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      members: {
        include: { user: { select: { id: true, name: true, email: true } } }
      }
    }
  });

  res.json({ success: true, data: workspace });
}));

// Delete workspace
router.delete('/:id', validateUUID(), handleValidationErrors, authenticateToken, asyncHandler(async (req, res) => {
  const workspace = await prisma.workspace.findFirst({
    where: { id: req.params.id, ownerId: req.user!.id }
  });

  if (!workspace) {
    return res.status(404).json({ success: false, error: 'Workspace not found or not owner' });
  }

  await prisma.workspace.delete({
    where: { id: req.params.id }
  });

  res.json({ success: true, message: 'Workspace deleted' });
}));

// Add member to workspace
router.post('/:id/members', validateUUID(), handleValidationErrors, authenticateToken, asyncHandler(async (req, res) => {
  const { email, role = 'viewer' } = req.body;

  // Check permissions
  const workspace = await prisma.workspace.findFirst({
    where: { id: req.params.id },
    include: {
      members: {
        where: { userId: req.user!.id }
      }
    }
  });

  if (!workspace) {
    return res.status(404).json({ success: false, error: 'Workspace not found' });
  }

  const isOwner = workspace.ownerId === req.user!.id;
  const userMember = workspace.members[0];
  const canManage = isOwner || (userMember && ['admin'].includes(userMember.role));

  if (!canManage) {
    return res.status(403).json({ success: false, error: 'Insufficient permissions' });
  }

  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }

  // Check if already a member
  const existing = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId: req.params.id,
        userId: user.id
      }
    }
  });

  if (existing) {
    return res.status(400).json({ success: false, error: 'User is already a member' });
  }

  const member = await prisma.workspaceMember.create({
    data: {
      workspaceId: req.params.id,
      userId: user.id,
      role: role as WorkspaceRole
    },
    include: {
      user: { select: { id: true, name: true, email: true } }
    }
  });

  res.json({ success: true, data: member });
}));

// Update member role
router.patch('/:id/members/:memberId', validateUUID(), validateUUID('memberId'), handleValidationErrors, authenticateToken, asyncHandler(async (req, res) => {
  const { role } = req.body;

  const workspace = await prisma.workspace.findFirst({
    where: { id: req.params.id }
  });

  if (!workspace) {
    return res.status(404).json({ success: false, error: 'Workspace not found' });
  }

  const isOwner = workspace.ownerId === req.user!.id;
  if (!isOwner) {
    return res.status(403).json({ success: false, error: 'Only owner can change roles' });
  }

  const member = await prisma.workspaceMember.update({
    where: { id: req.params.memberId },
    data: { role: role as WorkspaceRole },
    include: { user: { select: { id: true, name: true, email: true } } }
  });

  res.json({ success: true, data: member });
}));

// Remove member from workspace
router.delete('/:id/members/:memberId', validateUUID(), validateUUID('memberId'), handleValidationErrors, authenticateToken, asyncHandler(async (req, res) => {
  const workspace = await prisma.workspace.findFirst({
    where: { id: req.params.id }
  });

  if (!workspace) {
    return res.status(404).json({ success: false, error: 'Workspace not found' });
  }

  const isOwner = workspace.ownerId === req.user!.id;
  const memberToRemove = await prisma.workspaceMember.findFirst({
    where: { id: req.params.memberId }
  });

  if (!memberToRemove) {
    return res.status(404).json({ success: false, error: 'Member not found' });
  }

  // Can remove if owner, or if removing self
  const canRemove = isOwner || memberToRemove.userId === req.user!.id;

  if (!canRemove) {
    return res.status(403).json({ success: false, error: 'Insufficient permissions' });
  }

  await prisma.workspaceMember.delete({
    where: { id: req.params.memberId }
  });

  res.json({ success: true, message: 'Member removed' });
}));

// Get workspace workflows
router.get('/:id/workflows', validateUUID(), handleValidationErrors, authenticateToken, asyncHandler(async (req, res) => {
  // Verify user is a member of the workspace
  const workspace = await prisma.workspace.findFirst({
    where: {
      id: req.params.id,
      OR: [
        { ownerId: req.user!.id },
        { members: { some: { userId: req.user!.id } } }
      ]
    }
  });

  if (!workspace) {
    return res.status(403).json({ success: false, error: 'Access denied' });
  }

  const { limit, offset } = parsePagination(req.query);
  const where = { workspaceId: req.params.id };
  const [workflows, total] = await Promise.all([
    prisma.workflow.findMany({
      where,
      include: {
        _count: { select: { executions: true } }
      },
      take: limit,
      skip: offset
    }),
    prisma.workflow.count({ where })
  ]);

  res.json({ success: true, data: workflows, pagination: { total, limit, offset } });
}));

// Add workflow to workspace
router.post('/:id/workflows/:workflowId', validateUUID(), validateUUID('workflowId'), handleValidationErrors, authenticateToken, asyncHandler(async (req, res) => {
  const workspace = await prisma.workspace.findFirst({
    where: { id: req.params.id }
  });

  if (!workspace) {
    return res.status(404).json({ success: false, error: 'Workspace not found' });
  }

  // Check if user has permission to add workflows
  const isOwner = workspace.ownerId === req.user!.id;
  const member = await prisma.workspaceMember.findFirst({
    where: {
      workspaceId: req.params.id,
      userId: req.user!.id,
      role: { in: ['admin', 'editor'] }
    }
  });

  if (!isOwner && !member) {
    return res.status(403).json({ success: false, error: 'Insufficient permissions' });
  }

  const workflow = await prisma.workflow.update({
    where: { id: req.params.workflowId },
    data: { workspaceId: req.params.id }
  });

  res.json({ success: true, data: workflow });
}));

export default router;
