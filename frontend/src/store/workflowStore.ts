import { create } from 'zustand';
import { Workflow, WorkflowNode, WorkflowConnection, NodeType } from '../types';

interface WorkflowState {
  // Current workflow being edited
  currentWorkflow: Workflow | null;
  nodes: WorkflowNode[];
  connections: WorkflowConnection[];
  selectedNode: string | null;
  
  // Node types
  nodeTypes: NodeType[];
  categories: string[];
  
  // Actions
  setCurrentWorkflow: (workflow: Workflow | null) => void;
  setNodes: (nodes: WorkflowNode[]) => void;
  setConnections: (connections: WorkflowConnection[]) => void;
  addNode: (node: WorkflowNode) => void;
  updateNode: (id: string, updates: Partial<WorkflowNode>) => void;
  removeNode: (id: string) => void;
  addConnection: (connection: WorkflowConnection) => void;
  removeConnection: (id: string) => void;
  setSelectedNode: (id: string | null) => void;
  updateNodeParameters: (id: string, parameters: Record<string, any>) => void;
  setNodeTypes: (types: NodeType[]) => void;
  setCategories: (categories: string[]) => void;
  
  // Getters
  getNodeById: (id: string) => WorkflowNode | undefined;
  getNodeType: (type: string) => NodeType | undefined;
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  currentWorkflow: null,
  nodes: [],
  connections: [],
  selectedNode: null,
  nodeTypes: [],
  categories: [],

  setCurrentWorkflow: (workflow) => set({
    currentWorkflow: workflow,
    nodes: workflow?.nodes || [],
    connections: workflow?.connections || [],
    selectedNode: null
  }),

  setNodes: (nodes) => set({ nodes }),
  
  setConnections: (connections) => set({ connections }),

  addNode: (node) => set((state) => ({
    nodes: [...state.nodes, node]
  })),

  updateNode: (id, updates) => set((state) => ({
    nodes: state.nodes.map((n) =>
      n.id === id ? { ...n, ...updates } : n
    )
  })),

  removeNode: (id) => set((state) => ({
    nodes: state.nodes.filter((n) => n.id !== id),
    connections: state.connections.filter(
      (c) => c.source !== id && c.target !== id
    ),
    selectedNode: state.selectedNode === id ? null : state.selectedNode
  })),

  addConnection: (connection) => set((state) => ({
    connections: [...state.connections, connection]
  })),

  removeConnection: (id) => set((state) => ({
    connections: state.connections.filter((c) => c.id !== id)
  })),

  setSelectedNode: (id) => set({ selectedNode: id }),

  updateNodeParameters: (id, parameters) => set((state) => ({
    nodes: state.nodes.map((n) =>
      n.id === id
        ? { ...n, parameters: { ...n.parameters, ...parameters } }
        : n
    )
  })),

  setNodeTypes: (types) => set({ nodeTypes: types }),
  
  setCategories: (categories) => set({ categories }),

  getNodeById: (id) => get().nodes.find((n) => n.id === id),
  
  getNodeType: (type) => get().nodeTypes.find((t) => t.name === type)
}));
