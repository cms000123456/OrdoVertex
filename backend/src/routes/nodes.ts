import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../utils/auth';
import { successResponse, errorResponse } from '../utils/response';
import { nodeRegistry } from '../nodes';
import logger from '../utils/logger';
import { asyncHandler } from '../utils/async-handler';

const router = Router();

router.use(authMiddleware);

// Get all available nodes
router.get('/', asyncHandler((req: AuthRequest, res) => {
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

  res.set('Cache-Control', 'public, max-age=3600');
  return successResponse(res, nodes);
}));

// Get nodes by category
router.get('/categories', asyncHandler((req: AuthRequest, res) => {
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

  res.set('Cache-Control', 'public, max-age=3600');
  return successResponse(res, categories);
}));

// Get single node details
router.get('/:name', asyncHandler((req: AuthRequest, res) => {
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
}));

export default router;
