import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../utils/auth';
import { successResponse, errorResponse } from '../utils/response';
import { nodeRegistry } from '../nodes';

const router = Router();

router.use(authMiddleware);

// Get all available nodes
router.get('/', (req: AuthRequest, res) => {
  try {
    const nodes = nodeRegistry.getAll().map(node => ({
      name: node.name,
      displayName: node.displayName,
      description: node.description,
      icon: node.icon,
      category: node.category,
      version: node.version,
      inputs: node.inputs,
      outputs: node.outputs,
      properties: node.properties,
      credentials: node.credentials
    }));

    return successResponse(res, nodes);
  } catch (error: any) {
    console.error('Get nodes error:', error);
    return errorResponse(res, 'Failed to get nodes', 500);
  }
});

// Get nodes by category
router.get('/categories', (req: AuthRequest, res) => {
  try {
    const categories = nodeRegistry.getCategories().map(category => ({
      name: category,
      nodes: nodeRegistry.getByCategory(category).map(node => ({
        name: node.name,
        displayName: node.displayName,
        description: node.description,
        icon: node.icon,
        version: node.version,
        inputs: node.inputs,
        outputs: node.outputs,
        properties: node.properties
      }))
    }));

    return successResponse(res, categories);
  } catch (error: any) {
    console.error('Get categories error:', error);
    return errorResponse(res, 'Failed to get categories', 500);
  }
});

// Get single node details
router.get('/:name', (req: AuthRequest, res) => {
  try {
    const { name } = req.params;
    const node = nodeRegistry.get(name);

    if (!node) {
      return errorResponse(res, 'Node not found', 404);
    }

    return successResponse(res, {
      name: node.name,
      displayName: node.displayName,
      description: node.description,
      icon: node.icon,
      category: node.category,
      version: node.version,
      inputs: node.inputs,
      outputs: node.outputs,
      properties: node.properties,
      credentials: node.credentials
    });
  } catch (error: any) {
    console.error('Get node error:', error);
    return errorResponse(res, 'Failed to get node', 500);
  }
});

export default router;
