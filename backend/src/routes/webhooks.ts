import { Router, Request, Response } from 'express';
import { prisma } from '../prisma';
import { queueWorkflowExecution } from '../engine/queue';
import logger from '../utils/logger';
import { asyncHandler } from '../utils/async-handler';

const router = Router();

// Webhook handler - no auth required for external webhooks
router.all('/:workflowId/:path?', asyncHandler(async (req: Request, res: Response) => {
  const { workflowId, path = '' } = req.params;
  const method = req.method;

  // Find the workflow
  const workflow = await prisma.workflow.findUnique({
    where: { id: workflowId },
    include: { triggers: true }
  });

  if (!workflow) {
    return res.status(404).json({ error: 'Webhook not found' });
  }

  if (!workflow.active) {
    return res.status(503).json({ error: 'Workflow is inactive' });
  }

  // Find matching webhook trigger
  const webhookTrigger = workflow.triggers.find(
    t => t.type === 'webhook' && t.enabled
  );

  // Also check nodes for webhook configuration
  const nodes = workflow.nodes as any[];
  const webhookNode = nodes.find(n => n.type === 'webhook');

  if (!webhookNode) {
    return res.status(404).json({ error: 'No webhook trigger found' });
  }

  const nodeConfig = webhookNode.parameters;

  // Validate HTTP method
  if (nodeConfig.httpMethod && nodeConfig.httpMethod !== method) {
    return res.status(405).json({ 
      error: 'Method not allowed',
      allowed: nodeConfig.httpMethod 
    });
  }

  // Validate path if specified
  if (nodeConfig.path && nodeConfig.path !== path) {
    return res.status(404).json({ error: 'Webhook path not found' });
  }

  // Prepare webhook data
  const webhookData = {
    headers: req.headers,
    query: req.query,
    params: req.params,
    body: req.body,
    method: req.method,
    url: req.originalUrl,
    timestamp: new Date().toISOString()
  };

  // Determine response mode
  const responseMode = nodeConfig.responseMode || 'onReceived';

  if (responseMode === 'onReceived') {
    // Respond immediately
    let responseData: any = { success: true };
    if (nodeConfig.responseData) {
      try {
        responseData = JSON.parse(nodeConfig.responseData);
      } catch {
        return res.status(400).json({ success: false, error: 'Invalid JSON in responseData' });
      }
    }
    
    res.status(nodeConfig.responseCode || 200).json(responseData);

    // Queue execution after responding
    await queueWorkflowExecution(workflowId, workflow.userId, webhookData, 'webhook');
  } else {
    // Execute synchronously and return result
    // This would require a more complex implementation with job waiting
    // For now, queue and return accepted
    await queueWorkflowExecution(workflowId, workflow.userId, webhookData, 'webhook');
    
    res.status(202).json({ 
      success: true, 
      message: 'Webhook received, processing...' 
    });
  }

  // Update trigger last triggered
  if (webhookTrigger) {
    await prisma.trigger.update({
      where: { id: webhookTrigger.id },
      data: { lastTriggered: new Date() }
    });
  }
}));

export default router;