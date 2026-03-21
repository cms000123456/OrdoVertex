import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

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
            user: {
              select: { id: true, email: true, name: true }
            }
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
    const { name, description, workspaceId } = req.body;
    const userId = req.user!.id;

    // Check if user can manage workspace
    const membership = await prisma.workspaceMember.findFirst({
      where: { workspaceId, userId }
    });

    if (!membership) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const group = await prisma.userGroup.create({
      data: {
        name,
        description,
        workspaceId
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, email: true, name: true }
            }
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
    const { name, description } = req.body;
    const userId = req.user!.id;

    // Get group and check workspace membership
    const group = await prisma.userGroup.findFirst({
      where: { id },
      include: { workspace: { include: { members: true } } }
    });

    if (!group) {
      return res.status(404).json({ success: false, error: 'Group not found' });
    }

    const isMember = group.workspace.members.some(m => m.userId === userId);
    if (!isMember) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const updated = await prisma.userGroup.update({
      where: { id },
      data: { name, description },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, email: true, name: true }
            }
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

    // Get group and check workspace membership
    const group = await prisma.userGroup.findFirst({
      where: { id },
      include: { workspace: { include: { members: true } } }
    });

    if (!group) {
      return res.status(404).json({ success: false, error: 'Group not found' });
    }

    const isMember = group.workspace.members.some(m => m.userId === userId);
    if (!isMember) {
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

    // Get group and check workspace membership
    const group = await prisma.userGroup.findFirst({
      where: { id },
      include: { workspace: { include: { members: true } } }
    });

    if (!group) {
      return res.status(404).json({ success: false, error: 'Group not found' });
    }

    const isMember = group.workspace.members.some(m => m.userId === userId);
    if (!isMember) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    // Check if user to add is workspace member
    const targetIsMember = group.workspace.members.some(m => m.userId === memberUserId);
    if (!targetIsMember) {
      return res.status(400).json({ success: false, error: 'User must be workspace member first' });
    }

    // Check if already in group
    const existing = await prisma.userGroupMember.findFirst({
      where: { groupId: id, userId: memberUserId }
    });

    if (existing) {
      return res.status(400).json({ success: false, error: 'User already in group' });
    }

    const member = await prisma.userGroupMember.create({
      data: {
        groupId: id,
        userId: memberUserId
      },
      include: {
        user: {
          select: { id: true, email: true, name: true }
        }
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

    // Get group and check workspace membership
    const group = await prisma.userGroup.findFirst({
      where: { id },
      include: { workspace: { include: { members: true } } }
    });

    if (!group) {
      return res.status(404).json({ success: false, error: 'Group not found' });
    }

    const isMember = group.workspace.members.some(m => m.userId === userId);
    if (!isMember) {
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

export default router;
