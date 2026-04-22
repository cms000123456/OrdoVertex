import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { WorkspaceRole } from '@prisma/client';
import { prisma } from '../prisma';
import { authMiddleware, AuthRequest } from '../utils/auth';
import logger from '../utils/logger';
import { successResponse, errorResponse } from '../utils/response';
import { asyncHandler } from '../utils/async-handler';
const authenticateToken = authMiddleware;

const router = Router();

// Get all groups (admin sees all, users see groups they belong to)
router.get('/', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const isAdmin = req.user!.role === 'admin';

  let groups;
  if (isAdmin) {
    // Admin sees all groups with workspace access
    groups = await prisma.userGroup.findMany({
      include: {
        members: {
          include: {
            user: { select: { id: true, email: true, name: true } }
          }
        },
        workspaceAccess: {
          include: {
            workspace: { select: { id: true, name: true } }
          }
        },
        _count: { select: { members: true } }
      }
    });
  } else {
    // Users see groups they are members of
    groups = await prisma.userGroup.findMany({
      where: {
        members: { some: { userId } }
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, email: true, name: true } }
          }
        },
        workspaceAccess: {
          include: {
            workspace: { select: { id: true, name: true } }
          }
        },
        _count: { select: { members: true } }
      }
    });
  }

  res.json({ success: true, data: groups });
}));

// Get all groups for a workspace
router.get('/workspace/:workspaceId', authenticateToken, asyncHandler(async (req, res) => {
  const { workspaceId } = req.params;
  const userId = req.user!.id;

  // Check if user is member of workspace
  const membership = await prisma.workspaceMember.findFirst({
    where: { workspaceId, userId }
  });

  if (!membership) {
    return res.status(403).json({ success: false, error: 'Access denied' });
  }

  const groups = await prisma.userGroup.findMany({
    where: { workspaceId },
    include: {
      members: {
        include: {
          user: { select: { id: true, email: true, name: true } }
        }
      },
      workspaceAccess: {
        include: {
          workspace: { select: { id: true, name: true } }
        }
      },
      _count: { select: { members: true } }
    }
  });

  res.json({ success: true, data: groups });
}));

// Create a new group
router.post('/', authenticateToken, [
  body('name').trim().notEmpty().isLength({ max: 100 }).withMessage('Name is required and must be ≤ 100 characters'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Description must be ≤ 500 characters'),
  body('workspaceIds').optional().isArray().withMessage('workspaceIds must be an array')
], asyncHandler(async (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return errorResponse(res, 'Validation failed', 400, errors.array());
  }

  const { name, description, workspaceIds = [] } = req.body;
  const userId = req.user!.id;
  const isAdmin = req.user!.role === 'admin';

  // Verify user has access to all workspaces (if any provided)
  if (!isAdmin && workspaceIds.length > 0) {
    for (const wsId of workspaceIds) {
      const membership = await prisma.workspaceMember.findFirst({
        where: { workspaceId: wsId, userId }
      });
      if (!membership) {
        return errorResponse(res, `No access to workspace ${wsId}`, 403);
      }
    }
  }

  // Require admin to create groups with cross-workspace access
  if (workspaceIds.length > 1 && !isAdmin) {
    return errorResponse(res, 'Admin required for multi-workspace groups', 403);
  }

  const group = await prisma.$transaction(async (tx) => {
    return tx.userGroup.create({
      data: {
        name,
        description,
        workspaceId: workspaceIds[0] || null,
        workspaceAccess: workspaceIds.length > 0 ? {
          create: workspaceIds.map((wsId: string) => ({
            workspaceId: wsId,
            role: 'viewer' as WorkspaceRole
          }))
        } : undefined
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, email: true, name: true } }
          }
        },
        workspaceAccess: {
          include: {
            workspace: { select: { id: true, name: true } }
          }
        }
      }
    });
  });

  return successResponse(res, group, 201);
}));

// Update group
router.patch('/:id', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description, workspaceIds } = req.body;
  const userId = req.user!.id;
  const isAdmin = req.user!.role === 'admin';

  const group = await prisma.userGroup.findFirst({
    where: { id },
    include: { workspaceAccess: true }
  });

  if (!group) {
    return res.status(404).json({ success: false, error: 'Group not found' });
  }

  // Check permissions
  if (!isAdmin) {
    const isMember = await prisma.userGroupMember.findFirst({
      where: { groupId: id, userId }
    });
    if (!isMember) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
  }

  // Update workspace access if provided
  if (workspaceIds && isAdmin) {
    // Delete existing access
    await prisma.groupWorkspaceAccess.deleteMany({
      where: { groupId: id }
    });
      
    // Create new access entries
    if (workspaceIds.length > 0) {
      await prisma.groupWorkspaceAccess.createMany({
        data: workspaceIds.map((wsId: string) => ({
          groupId: id,
          workspaceId: wsId,
          role: 'viewer' as WorkspaceRole
        }))
      });
    }
  }

  const updated = await prisma.userGroup.update({
    where: { id },
    data: { 
      name, 
      description,
      workspaceId: workspaceIds?.[0] || group.workspaceId
    },
    include: {
      members: {
        include: {
          user: { select: { id: true, email: true, name: true } }
        }
      },
      workspaceAccess: {
        include: {
          workspace: { select: { id: true, name: true } }
        }
      }
    }
  });

  res.json({ success: true, data: updated });
}));

// Delete group
router.delete('/:id', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user!.id;
  const isAdmin = req.user!.role === 'admin';

  const group = await prisma.userGroup.findFirst({
    where: { id },
    include: { 
      workspace: { include: { members: true } },
      workspaceAccess: true
    }
  });

  if (!group) {
    return res.status(404).json({ success: false, error: 'Group not found' });
  }

  const isMember = group.workspace?.members?.some((m: any) => m.userId === userId);
  if (!isMember && !isAdmin) {
    return res.status(403).json({ success: false, error: 'Access denied' });
  }

  await prisma.userGroup.delete({ where: { id } });

  res.json({ success: true, message: 'Group deleted' });
}));

// Add member to group
router.post('/:id/members', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { userId: memberUserId } = req.body;
  const userId = req.user!.id;
  const isAdmin = req.user!.role === 'admin';

  const group = await prisma.userGroup.findFirst({
    where: { id },
    include: { workspace: { include: { members: true } } }
  });

  if (!group) {
    return res.status(404).json({ success: false, error: 'Group not found' });
  }

  const isMember = group.workspace?.members?.some((m: any) => m.userId === userId);
  if (!isMember && !isAdmin) {
    return res.status(403).json({ success: false, error: 'Access denied' });
  }

  // Check if target user is workspace member (only if group has a workspace)
  if (group.workspace) {
    const targetIsMember = group.workspace.members?.some((m: any) => m.userId === memberUserId);
    if (!targetIsMember) {
      return res.status(400).json({ success: false, error: 'User must be workspace member first' });
    }
  }

  const existing = await prisma.userGroupMember.findFirst({
    where: { groupId: id, userId: memberUserId }
  });

  if (existing) {
    return res.status(400).json({ success: false, error: 'User already in group' });
  }

  const member = await prisma.userGroupMember.create({
    data: { groupId: id, userId: memberUserId },
    include: {
      user: { select: { id: true, email: true, name: true } }
    }
  });

  res.json({ success: true, data: member });
}));

// Remove member from group
router.delete('/:id/members/:memberId', authenticateToken, asyncHandler(async (req, res) => {
  const { id, memberId } = req.params;
  const userId = req.user!.id;
  const isAdmin = req.user!.role === 'admin';

  const group = await prisma.userGroup.findFirst({
    where: { id },
    include: { workspace: { include: { members: true } } }
  });

  if (!group) {
    return res.status(404).json({ success: false, error: 'Group not found' });
  }

  const isMember = group.workspace?.members?.some((m: any) => m.userId === userId);
  if (!isMember && !isAdmin) {
    return res.status(403).json({ success: false, error: 'Access denied' });
  }

  await prisma.userGroupMember.delete({
    where: { id: memberId }
  });

  res.json({ success: true, message: 'Member removed' });
}));

// Add workspace access to group
router.post('/:id/workspaces', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { workspaceId, role = 'viewer' } = req.body;
  const userId = req.user!.id;
  const isAdmin = req.user!.role === 'admin';

  if (!isAdmin) {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }

  const access = await prisma.groupWorkspaceAccess.create({
    data: {
      groupId: id,
      workspaceId,
      role: role as WorkspaceRole
    },
    include: {
      workspace: { select: { id: true, name: true } }
    }
  });

  res.json({ success: true, data: access });
}));

// Remove workspace access from group
router.delete('/:id/workspaces/:accessId', authenticateToken, asyncHandler(async (req, res) => {
  const { accessId } = req.params;
  const isAdmin = req.user!.role === 'admin';

  if (!isAdmin) {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }

  await prisma.groupWorkspaceAccess.delete({
    where: { id: accessId }
  });

  res.json({ success: true, message: 'Workspace access removed' });
}));

export default router;