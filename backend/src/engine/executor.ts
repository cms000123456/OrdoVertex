import { PrismaClient } from '@prisma/client';
import { nodeRegistry } from '../nodes';
import { 
  WorkflowDefinition, 
  WorkflowNode, 
  WorkflowConnection,
  NodeExecuteContext,
  ExecutionContext,
  ExecutionHooks 
} from '../types';

const prisma = new PrismaClient();

export class WorkflowExecutor {
  private context: ExecutionContext;
  private executionId: string;
  private workflow: WorkflowDefinition;
  private nodeOutputs: Map<string, any> = new Map();
  private visitedNodes: Set<string> = new Set();

  constructor(executionId: string, workflow: WorkflowDefinition, userId: string, initialData: any = {}) {
    this.executionId = executionId;
    this.workflow = workflow;
    this.context = {
      executionId,
      workflowId: workflow.id,
      workflow,
      userId,
      data: initialData,
      nodeOutputs: this.nodeOutputs,
      hooks: {}
    };
  }

  async execute(): Promise<{ success: boolean; output?: any; error?: string }> {
    const startTime = Date.now();
    
    try {
      // Find trigger nodes (nodes with no inputs or trigger-type nodes)
      const triggerNodes = this.findTriggerNodes();
      
      if (triggerNodes.length === 0) {
        throw new Error('No trigger node found in workflow');
      }

      // Execute starting from each trigger
      for (const triggerNode of triggerNodes) {
        await this.executeNode(triggerNode, [{ json: this.context.data }]);
      }

      // Get the final output from the last executed nodes
      const finalOutput = this.getFinalOutput();

      // Update execution status
      await prisma.workflowExecution.update({
        where: { id: this.executionId },
        data: {
          status: 'success',
          finishedAt: new Date(),
          result: finalOutput
        }
      });

      const duration = Date.now() - startTime;
      console.log(`✅ Workflow ${this.workflow.id} executed successfully in ${duration}ms`);

      return {
        success: true,
        output: finalOutput
      };

    } catch (error: any) {
      console.error(`❌ Workflow execution failed:`, error);

      await prisma.workflowExecution.update({
        where: { id: this.executionId },
        data: {
          status: 'failed',
          finishedAt: new Date(),
          error: error.message
        }
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  private findTriggerNodes(): WorkflowNode[] {
    return this.workflow.nodes.filter(node => {
      const nodeType = nodeRegistry.get(node.type);
      return nodeType?.category === 'Triggers' || 
             node.inputs === undefined || 
             node.inputs?.length === 0;
    });
  }

  private async executeNode(node: WorkflowNode, inputItems: any[]): Promise<any[]> {
    // Prevent infinite loops
    if (this.visitedNodes.has(node.id)) {
      console.log(`⚠️ Node ${node.name} already visited, skipping`);
      return this.nodeOutputs.get(node.id) || [];
    }
    this.visitedNodes.add(node.id);

    const nodeType = nodeRegistry.get(node.type);
    if (!nodeType) {
      throw new Error(`Unknown node type: ${node.type}`);
    }

    console.log(`▶️ Executing node: ${node.name} (${node.type})`);

    // Create node execution record
    const nodeExecution = await prisma.nodeExecution.create({
      data: {
        executionId: this.executionId,
        nodeId: node.id,
        nodeName: node.name,
        nodeType: node.type,
        status: 'running',
        input: inputItems
      }
    });

    const startTime = Date.now();

    try {
      // Call hook if exists
      if (this.context.hooks.onNodeExecuteStart) {
        await this.context.hooks.onNodeExecuteStart(node.id, inputItems);
      }

      // Prepare execution context
      const nodeContext: NodeExecuteContext = {
        node,
        items: inputItems,
        userId: this.context.userId,
        getInputData: () => inputItems,
        getNodeParameter: (name: string, fallback?: any) => {
          return node.parameters?.[name] ?? fallback;
        },
        continueOnFail: () => false
      };

      // Execute the node
      const result = await nodeType.execute(nodeContext);

      if (!result.success) {
        throw result.error || new Error(`Node ${node.name} failed`);
      }

      const output = result.output || [];
      this.nodeOutputs.set(node.id, output);

      // Update node execution
      await prisma.nodeExecution.update({
        where: { id: nodeExecution.id },
        data: {
          status: 'success',
          finishedAt: new Date(),
          output
        }
      });

      // Call hook if exists
      if (this.context.hooks.onNodeExecuteComplete) {
        await this.context.hooks.onNodeExecuteComplete(node.id, output);
      }

      const duration = Date.now() - startTime;
      console.log(`✅ Node ${node.name} completed in ${duration}ms`);

      // Find and execute connected nodes
      const connectedNodes = this.findConnectedNodes(node);
      for (const connectedNode of connectedNodes) {
        await this.executeNode(connectedNode, output);
      }

      return output;

    } catch (error: any) {
      console.error(`❌ Node ${node.name} failed:`, error);

      await prisma.nodeExecution.update({
        where: { id: nodeExecution.id },
        data: {
          status: 'failed',
          finishedAt: new Date(),
          error: error.message
        }
      });

      if (this.context.hooks.onNodeExecuteError) {
        await this.context.hooks.onNodeExecuteError(node.id, error);
      }

      throw error;
    }
  }

  private findConnectedNodes(node: WorkflowNode): WorkflowNode[] {
    const connections = this.workflow.connections.filter(
      conn => conn.source === node.id
    );

    return connections
      .map(conn => this.workflow.nodes.find(n => n.id === conn.target))
      .filter((n): n is WorkflowNode => n !== undefined);
  }

  private getFinalOutput(): any {
    // Find nodes with no outgoing connections (end nodes)
    const endNodeIds = new Set(
      this.workflow.nodes
        .filter(node => 
          !this.workflow.connections.some(conn => conn.source === node.id)
        )
        .map(node => node.id)
    );

    // Return output from the last executed end node
    for (const nodeId of Array.from(this.visitedNodes).reverse()) {
      if (endNodeIds.has(nodeId)) {
        return this.nodeOutputs.get(nodeId);
      }
    }

    // If no end nodes found, return the last node's output
    const lastNodeId = Array.from(this.visitedNodes).pop();
    return lastNodeId ? this.nodeOutputs.get(lastNodeId) : null;
  }
}

export async function executeWorkflow(
  workflowId: string, 
  userId: string,
  data: any = {},
  mode: 'manual' | 'webhook' | 'schedule' = 'manual'
): Promise<{ executionId: string; result: any }> {
  // Get workflow from database
  const workflow = await prisma.workflow.findUnique({
    where: { id: workflowId }
  });

  if (!workflow) {
    throw new Error(`Workflow not found: ${workflowId}`);
  }

  // Create execution record
  const execution = await prisma.workflowExecution.create({
    data: {
      workflowId,
      status: 'running',
      data,
      mode
    }
  });

  // Parse workflow definition
  const workflowDef: WorkflowDefinition = {
    id: workflow.id,
    name: workflow.name,
    description: workflow.description || undefined,
    active: workflow.active,
    nodes: workflow.nodes as any,
    connections: workflow.connections as any,
    settings: workflow.settings as any
  };

  // Execute
  const executor = new WorkflowExecutor(execution.id, workflowDef, userId, data);
  const result = await executor.execute();

  return {
    executionId: execution.id,
    result
  };
}
