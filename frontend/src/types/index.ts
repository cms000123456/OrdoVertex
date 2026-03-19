export type UserRole = 'user' | 'admin';

export interface User {
  id: string;
  email: string;
  name?: string;
  role: UserRole;
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  active: boolean;
  nodes: WorkflowNode[];
  connections: WorkflowConnection[];
  settings?: WorkflowSettings;
  createdAt: string;
  updatedAt: string;
  executions?: Execution[];
  _count?: {
    executions: number;
  };
}

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

export interface WorkflowSettings {
  saveExecutionProgress?: boolean;
  saveManualExecutions?: boolean;
  timezone?: string;
  executionTimeout?: number;
  errorWorkflow?: string;
}

export interface Execution {
  id: string;
  workflowId: string;
  status: 'running' | 'success' | 'failed' | 'waiting' | 'canceled';
  startedAt: string;
  finishedAt?: string;
  data?: any;
  result?: any;
  error?: string;
  mode: string;
  nodeExecutions?: NodeExecution[];
  workflow?: {
    id: string;
    name: string;
  };
}

export interface NodeExecution {
  id: string;
  executionId: string;
  nodeId: string;
  nodeName: string;
  status: 'running' | 'success' | 'failed' | 'waiting' | 'canceled';
  startedAt: string;
  finishedAt?: string;
  input?: any;
  output?: any;
  error?: string;
}

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
  type: 'string' | 'number' | 'boolean' | 'json' | 'options' | 'multiline' | 'resource';
  default?: any;
  placeholder?: string;
  description?: string;
  required?: boolean;
  options?: Array<{ name: string; value: string; description?: string }>;
  resourceType?: string;
  displayOptions?: {
    show?: Record<string, any[]>;
    hide?: Record<string, any[]>;
  };
}

export interface NodeCredential {
  name: string;
  requiredFields: string[];
}

// Credential Types
export interface Credential {
  id: string;
  name: string;
  type: 'database' | 'http' | 'oauth2' | 'apiKey' | 'ssh' | 'generic';
  data?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  lastUsed?: string;
}

export interface CredentialTypeInfo {
  name: string;
  description: string;
  fields: CredentialField[];
}

export interface CredentialField {
  name: string;
  type: 'string' | 'number' | 'boolean';
  displayName: string;
  required: boolean;
  sensitive?: boolean;
  multiline?: boolean;
  default?: any;
}
