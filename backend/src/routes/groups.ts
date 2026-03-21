import { Router } from 'express';
import { PrismaClient, WorkspaceRole } from '@prisma/client';
import { authMiddleware } from '../utils/auth';
const authenticateToken = authMiddleware;

const router = Router();
const prisma = new PrismaClient();

// Get all groups (admin sees all, users see groups they belong to)
router.get('/', authenticateToken, async (req, res) => {
  try {
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
  } catch (error: any) {
    console.error('Get groups error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all groups for a workspace
router.get('/workspace/:workspaceId', authenticateToken, async (req, res) => {
  try {
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
  } catch (error: any) {
    console.error('Get groups error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create a new group
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, description, workspaceIds = [] } = req.body;
    const userId = req.user!.id;
    const isAdmin = req.user!.role === 'admin';

    // Require admin to create groups with cross-workspace access
    if (workspaceIds.length > 1 && !isAdmin) {
      return res.status(403).json({ success: false, error: 'Admin required for multi-workspace groups' });
    }

    // For non-admin, require at least one workspace where they are a member
    if (!isAdmin && workspaceIds.length === 0) {
      return res.status(400).json({ success: false, error: 'At least one workspace required' });
    }

    // Verify user has access to all workspaces
    if (!isAdmin) {
      for (const wsId of workspaceIds) {
        const membership = await prisma.workspaceMember.findFirst({
          where: { workspaceId: wsId, userId }
        });
        if (!membership) {
          return res.status(403).json({ success: false, error: `No access to workspace ${wsId}` });
        }
      }
    }

    const group = await prisma.userGroup.create({
      data: {
        name,
        description,
        workspaceId: workspaceIds[0] || null as any, // Primary workspace
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

    res.json({ success: true, data: group });
  } catch (error: any) {
    console.error('Create group error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update group
router.patch('/:id', authenticateToken, async (req, res) => {
  try {
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
  } catch (error: any) {
    console.error('Update group error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete group
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
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
  } catch (error: any) {
    console.error('Delete group error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add member to group
router.post('/:id/members', authenticateToken, async (req, res) => {
  try {
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

    // Check if target user is workspace member
    const targetIsMember = group.workspace?.members?.some((m: any) => m.userId === memberUserId);
    if (!targetIsMember) {
      return res.status(400).json({ success: false, error: 'User must be workspace member first' });
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
  } catch (error: any) {
    console.error('Add group member error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Remove member from group
router.delete('/:id/members/:memberId', authenticateToken, async (req, res) => {
  try {
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
  } catch (error: any) {
    console.error('Remove group member error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add workspace access to group
router.post('/:id/workspaces', authenticateToken, async (req, res) => {
  try {
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
  } catch (error: any) {
    console.error('Add workspace access error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Remove workspace access from group
router.delete('/:id/workspaces/:accessId', authenticateToken, async (req, res) => {
  try {
    const { accessId } = req.params;
    const isAdmin = req.user!.role === 'admin';

    if (!isAdmin) {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    await prisma.groupWorkspaceAccess.delete({
      where: { id: accessId }
    });

    res.json({ success: true, message: 'Workspace access removed' });
  } catch (error: any) {
    console.error('Remove workspace access error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
