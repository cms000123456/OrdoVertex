// Workflow Types
export interface WorkflowNode {
  id: string;
  type: string;
  name: string;
  description?: string;
  position: { x: number; y: number };
  parameters: Record<string, any>;
  credentials?: Record<string, string>;
}

export interface WorkflowConnection {
  id: string;
  source: string;
  sourceHandle?: string;
  target: string;
  targetHandle?: string;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  description?: string;
  active: boolean;
  nodes: WorkflowNode[];
  connections: WorkflowConnection[];
  settings?: WorkflowSettings;
}

export interface WorkflowSettings {
  saveExecutionProgress?: boolean;
  saveManualExecutions?: boolean;
  timezone?: string;
  executionTimeout?: number;
  errorWorkflow?: string;
}

// Execution Types
export interface ExecutionContext {
  executionId: string;
  workflowId: string;
  workflow: WorkflowDefinition;
  userId: string;  // Maps to req.user!.id
  data: Record<string, any>;
  nodeOutputs: Map<string, any>;
  hooks: ExecutionHooks;
}

export interface ExecutionHooks {
  onNodeExecuteStart?: (nodeId: string, input: any) => Promise<void>;
  onNodeExecuteComplete?: (nodeId: string, output: any) => Promise<void>;
  onNodeExecuteError?: (nodeId: string, error: Error) => Promise<void>;
}

// Node Types
export interface NodeType {
  name: string;
  displayName: string;
  description: string;
  icon?: string;
  category: string;
  version: number;
  inputs: NodeInput[];
  outputs: NodeOutput[];
  properties: NodeProperty[];
  credentials?: NodeCredential[];
  execute: (context: NodeExecuteContext) => Promise<NodeExecuteResult>;
}

export interface NodeInput {
  name: string;
  type: string;
  required?: boolean;
  description?: string;
}

export interface NodeOutput {
  name: string;
  type: string;
  description?: string;
}

export interface NodeProperty {
  name: string;
  displayName: string;
  type: 'string' | 'number' | 'boolean' | 'json' | 'options' | 'multiline' | 'resource' | 'multiselect' | 'timezone';
  default?: any;
  placeholder?: string;
  description?: string;
  required?: boolean;
  sensitive?: boolean;
  min?: number;
  max?: number;
  options?: Array<{ name: string; value: string | number; description?: string }>;
  resourceType?: string;
  displayOptions?: DisplayOptions;
}

export interface DisplayOptions {
  show?: Record<string, any[]>;
  hide?: Record<string, any[]>;
}

export interface NodeCredential {
  name: string;
  requiredFields: string[];
}

export interface NodeExecuteContext {
  node: WorkflowNode;
  items: any[];
  credentials?: Record<string, string>;
  userId: string;
  executionId?: string;
  getInputData: () => any[];
  getNodeParameter: (name: string, fallback?: any) => any;
  continueOnFail: () => boolean;
}

export interface NodeExecuteResult {
  success: boolean;
  output?: any[];
  error?: string | Error;
  binary?: Record<string, any>;
}

// Trigger Types
export interface TriggerConfig {
  type: 'webhook' | 'schedule' | 'manual' | 'polling';
  enabled: boolean;
  config: WebhookTriggerConfig | ScheduleTriggerConfig | ManualTriggerConfig;
}

export interface WebhookTriggerConfig {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  responseMode?: 'onReceived' | 'lastNode';
  responseData?: string;
}

export interface ScheduleTriggerConfig {
  cron: string;
  timezone?: string;
}

export interface ManualTriggerConfig {
  // No special config needed for manual trigger
}
