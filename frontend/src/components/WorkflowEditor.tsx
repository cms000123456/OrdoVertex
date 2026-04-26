import React, { useCallback, useEffect, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
  Edge,
  Node,
  Panel,
  useReactFlow,
  ReactFlowProvider
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Play, Save, ArrowLeft, Terminal, Key, Sparkles, Power, Square } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

import { useWorkflowStore } from '../store/workflowStore';
import { nodesApi, workflowsApi, executionsApi } from '../services/api';
import { NodeType, WorkflowNode, WorkflowConnection } from '../types';

import { WorkflowNode as WorkflowNodeComponent } from './nodes/WorkflowNode';
import { NodePanel } from './NodePanel';
import { NodeConfigPanel } from './NodeConfigPanel';
import { WorkflowSelector } from './WorkflowSelector';
import { ExecutionResults } from './ExecutionResults';
import { CredentialsManager } from './CredentialsManager';
import './WorkflowEditor.css';

const nodeTypes = {
  workflowNode: WorkflowNodeComponent
};

// Generate unique ID
const generateId = () => Math.random().toString(36).substr(2, 9);

function Flow() {
  const reactFlowInstance = useReactFlow();
  const navigate = useNavigate();
  const [nodes, setNodes, onNodesChangeOriginal] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [nodeTypesList, setNodeTypesList] = useState<NodeType[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isTogglingActive, setIsTogglingActive] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);
  const [runningNodeIds, setRunningNodeIds] = useState<Set<string>>(new Set());
  const [completedNodeStatuses, setCompletedNodeStatuses] = useState<Record<string, string>>({});
  const [activeExecutionId, setActiveExecutionId] = useState<string | null>(null);
  
  // Config panel resize state
  const [configPanelWidth, setConfigPanelWidth] = useState(800);
  const [isResizing, setIsResizing] = useState(false);

  const {
    currentWorkflow,
    nodes: storeNodes,
    connections: storeConnections,
    selectedNode,
    setSelectedNode,
    setNodes: setStoreNodes,
    setConnections: setStoreConnections,
    setNodeTypes,
    updateNodeParameters,
    setCurrentWorkflow,
    patchCurrentWorkflow
  } = useWorkflowStore();

  // Helper functions for node display
  const getNodeIcon = useCallback((type: string) => {
    const nodeType = nodeTypesList.find((nt) => nt.name === type);
    return nodeType?.icon || 'fa:circle';
  }, [nodeTypesList]);

  const getNodeCategory = useCallback((type: string) => {
    const nodeType = nodeTypesList.find((nt) => nt.name === type);
    return nodeType?.category || 'Unknown';
  }, [nodeTypesList]);

  // Load node types
  useEffect(() => {
    const loadNodeTypes = async () => {
      try {
        const response = await nodesApi.getAll();
        setNodeTypesList(response.data.data);
        setNodeTypes(response.data.data);
      } catch (error) {
        toast.error('Failed to load node types');
      }
    };
    loadNodeTypes();
  }, [setNodeTypes]);

  // Initial sync from store to ReactFlow when workflow loads
  useEffect(() => {
    if (currentWorkflow) {
      const flowNodes: Node[] = storeNodes.map((node) => ({
        id: node.id,
        type: 'workflowNode',
        position: node.position,
        data: {
          label: node.name,
          type: node.type,
          description: node.description,
          parameters: node.parameters,
          icon: getNodeIcon(node.type),
          category: getNodeCategory(node.type)
        },
        selected: node.id === selectedNode
      }));

      const flowEdges: Edge[] = storeConnections.map((conn, index) => ({
        id: conn.id || `edge-${conn.source}-${conn.target}-${index}`,
        source: conn.source,
        target: conn.target,
        sourceHandle: conn.sourceHandle,
        targetHandle: conn.targetHandle,
        animated: true,
        style: { stroke: '#6366f1', strokeWidth: 2 }
      }));

      setNodes(flowNodes);
      setEdges(flowEdges);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWorkflow]); // Only re-run when workflow changes (initial load)

  // Custom onNodesChange that syncs position changes to store
  const onNodesChange = useCallback((changes: any[]) => {
    // Apply changes to ReactFlow state
    onNodesChangeOriginal(changes);
    
    // Sync position changes to store
    const positionChanges = changes.filter((c: any) => c.type === 'position' && c.position);
    if (positionChanges.length > 0) {
      const currentNodes = useWorkflowStore.getState().nodes;
      const updatedNodes = currentNodes.map((node) => {
        const change = positionChanges.find((c: any) => c.id === node.id);
        if (change) {
          return { ...node, position: change.position };
        }
        return node;
      });
      setStoreNodes(updatedNodes);
    }
  }, [onNodesChangeOriginal, setStoreNodes]);

  // Update selection state when selectedNode changes
  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => ({
        ...node,
        selected: node.id === selectedNode
      }))
    );
  }, [selectedNode, setNodes]);

  // Sync description and parameter changes from store to ReactFlow nodes
  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => {
        const storeNode = storeNodes.find((n) => n.id === node.id);
        if (!storeNode) return node;
        
        const needsUpdate = 
          storeNode.description !== node.data.description ||
          JSON.stringify(storeNode.parameters) !== JSON.stringify(node.data.parameters);
        
        if (needsUpdate) {
          return {
            ...node,
            data: {
              ...node.data,
              description: storeNode.description,
              parameters: storeNode.parameters
            }
          };
        }
        return node;
      })
    );
  }, [storeNodes, setNodes]);

  // Sync execution status to ReactFlow nodes
  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => {
        const status = runningNodeIds.has(node.id)
          ? 'running'
          : completedNodeStatuses[node.id] || undefined;
        if (node.data.executionStatus !== status) {
          return {
            ...node,
            data: { ...node.data, executionStatus: status }
          };
        }
        return node;
      })
    );
  }, [runningNodeIds, completedNodeStatuses, setNodes]);

  const onConnect = useCallback(
    (params: Connection) => {
      // Prevent connections to/from sticky notes (they're annotations only)
      const sourceNode = storeNodes.find(n => n.id === params.source);
      const targetNode = storeNodes.find(n => n.id === params.target);
      
      if (sourceNode?.type === 'stickyNote' || targetNode?.type === 'stickyNote') {
        return; // Don't allow connections to/from sticky notes
      }
      
      const newEdge: Edge = {
        id: generateId(),
        source: params.source!,
        target: params.target!,
        sourceHandle: params.sourceHandle,
        targetHandle: params.targetHandle,
        animated: true,
        style: { stroke: '#6366f1', strokeWidth: 2 }
      };
      setEdges((eds) => addEdge(newEdge, eds));

      // Update store
      const currentEdges = useWorkflowStore.getState().connections;
      const newConnection: WorkflowConnection = {
        id: newEdge.id,
        source: params.source!,
        target: params.target!,
        sourceHandle: params.sourceHandle || undefined,
        targetHandle: params.targetHandle || undefined
      };
      setStoreConnections([...currentEdges, newConnection]);
    },
    [setEdges, setStoreConnections, storeNodes]
  );

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node.id);
  }, [setSelectedNode]);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, [setSelectedNode]);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      if (!type) return;

      const nodeType = nodeTypesList.find((nt) => nt.name === type);
      if (!nodeType) return;

      // Get the position where the node is dropped
      // Use screenToFlowPosition if available (v11.9+), otherwise fall back to project
      let position;
      if (reactFlowInstance.screenToFlowPosition) {
        position = reactFlowInstance.screenToFlowPosition({
          x: event.clientX,
          y: event.clientY
        });
      } else {
        // Fallback for older versions
        position = reactFlowInstance.project({
          x: event.clientX - 250,
          y: event.clientY - 80
        });
      }
      const newNode: WorkflowNode = {
        id: generateId(),
        type: nodeType.name,
        name: nodeType.displayName,
        position,
        parameters: {}
      };

      // Add to store
      const currentNodes = useWorkflowStore.getState().nodes;
      setStoreNodes([...currentNodes, newNode]);

      // Add to ReactFlow
      const flowNode = {
        id: newNode.id,
        type: 'workflowNode',
        position,
        data: {
          label: newNode.name,
          type: nodeType.name,
          description: newNode.description,
          icon: nodeType.icon,
          category: nodeType.category
        }
      };
      
      setNodes((nds) => [...nds, flowNode]);
      setSelectedNode(newNode.id);
    },
    [reactFlowInstance, nodeTypesList, setNodes, setStoreNodes, setSelectedNode]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onNodesDelete = useCallback((deleted: Node[]) => {
    const currentNodes = useWorkflowStore.getState().nodes;
    const currentEdges = useWorkflowStore.getState().connections;

    const deletedIds = new Set(deleted.map((n) => n.id));
    setStoreNodes(currentNodes.filter((n) => !deletedIds.has(n.id)));
    setStoreConnections(
      currentEdges.filter(
        (e) => !deletedIds.has(e.source) && !deletedIds.has(e.target)
      )
    );
  }, [setStoreNodes, setStoreConnections]);

  const onEdgesDelete = useCallback((deleted: Edge[]) => {
    const currentEdges = useWorkflowStore.getState().connections;
    const deletedIds = new Set(deleted.map((e) => e.id));
    setStoreConnections(currentEdges.filter((e) => !deletedIds.has(e.id)));
  }, [setStoreConnections]);

  const handleSave = async () => {
    if (!currentWorkflow) return;

    setIsSaving(true);
    try {
      // Update positions from ReactFlow nodes
      const updatedNodes = nodes.map((flowNode) => {
        const storeNode = useWorkflowStore
          .getState()
          .nodes.find((n) => n.id === flowNode.id);
        return {
          ...storeNode!,
          position: flowNode.position
        };
      });

      const data = {
        name: currentWorkflow.name,
        description: currentWorkflow.description,
        nodes: updatedNodes,
        connections: useWorkflowStore.getState().connections,
        active: currentWorkflow.active
      };

      await workflowsApi.update(currentWorkflow.id, data);
      patchCurrentWorkflow({ nodes: updatedNodes, connections: data.connections });
      toast.success('Workflow saved successfully');
    } catch (error) {
      toast.error('Failed to save workflow');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async () => {
    if (!currentWorkflow) return;
    setIsTogglingActive(true);
    try {
      const newActive = !currentWorkflow.active;
      await workflowsApi.update(currentWorkflow.id, { active: newActive });
      patchCurrentWorkflow({ active: newActive });
      toast.success(newActive ? 'Workflow activated' : 'Workflow deactivated');
    } catch (error) {
      toast.error('Failed to update workflow status');
    } finally {
      setIsTogglingActive(false);
    }
  };

  const handleExecute = async () => {
    if (!currentWorkflow) return;

    setIsExecuting(true);
    setRunningNodeIds(new Set());
    setCompletedNodeStatuses({});
    try {
      const response = await workflowsApi.execute(currentWorkflow.id);
      const executionId = response.data?.data?.executionId;
      if (executionId) {
        setActiveExecutionId(executionId);
      }
      toast.success('Workflow execution started');
    } catch (error) {
      toast.error('Failed to start workflow execution');
    } finally {
      setIsExecuting(false);
    }
  };

  const handleCancel = async () => {
    if (!activeExecutionId) return;
    try {
      await executionsApi.cancel(activeExecutionId);
      toast.success('Execution canceled');
      setActiveExecutionId(null);
      setRunningNodeIds(new Set());
      setCompletedNodeStatuses({});
    } catch (error) {
      toast.error('Failed to cancel execution');
    }
  };

  // Poll execution status to show running nodes on canvas
  useEffect(() => {
    if (!activeExecutionId) return;

    const poll = async () => {
      try {
        const response = await executionsApi.getById(activeExecutionId);
        const execution = response.data?.data;
        if (execution?.nodeExecutions) {
          const running = new Set<string>();
          const completed: Record<string, string> = {};
          execution.nodeExecutions.forEach((ne: any) => {
            if (ne.status === 'running') {
              running.add(ne.nodeId);
            } else if (ne.status === 'success' || ne.status === 'failed') {
              completed[ne.nodeId] = ne.status;
            }
          });
          setRunningNodeIds(running);
          setCompletedNodeStatuses(completed);
        }

        if (execution?.status !== 'running' && execution?.status !== 'waiting') {
          // Execution finished, clear running state after a brief delay
          setTimeout(() => {
            setActiveExecutionId(null);
            setRunningNodeIds(new Set());
          }, execution?.status === 'canceled' ? 500 : 3000);
        }
      } catch (err) {
        console.error('Failed to poll execution status:', err);
      }
    };

    poll();
    const interval = setInterval(poll, 2000);
    return () => clearInterval(interval);
  }, [activeExecutionId]);

  const handleParameterChange = (key: string, value: any) => {
    if (selectedNode) {
      if (key === '__description') {
        // Handle description update separately
        const { nodes, setNodes } = useWorkflowStore.getState();
        const updatedNodes = nodes.map(n => 
          n.id === selectedNode ? { ...n, description: value } : n
        );
        setNodes(updatedNodes);
      } else {
        updateNodeParameters(selectedNode, { [key]: value });
      }
    }
  };

  // Config panel resize handlers
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;
    
    // Calculate new width based on mouse position from right edge
    const newWidth = Math.max(280, Math.min(800, window.innerWidth - e.clientX));
    setConfigPanelWidth(newWidth);
  }, [isResizing]);

  const handleResizeEnd = useCallback(() => {
    setIsResizing(false);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  // Add/remove resize event listeners
  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleResizeMove);
      window.addEventListener('mouseup', handleResizeEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleResizeMove);
      window.removeEventListener('mouseup', handleResizeEnd);
    };
  }, [isResizing, handleResizeMove, handleResizeEnd]);

  // Listen for credential manager open event
  useEffect(() => {
    const handleOpenCredentials = () => setShowCredentials(true);
    window.addEventListener('openCredentialsManager', handleOpenCredentials);
    return () => window.removeEventListener('openCredentialsManager', handleOpenCredentials);
  }, []);

  return (
    <div className="workflow-editor">
      <div className="editor-header">
        <div className="header-left">
          <button
            className="btn btn-secondary btn-icon"
            onClick={() => navigate('/workflows')}
            title="Back to workflows"
          >
            <ArrowLeft size={18} />
          </button>
          <WorkflowSelector currentWorkflowId={currentWorkflow?.id} />
        </div>
        <div className="header-actions">
          <button
            className="btn btn-ai-help"
            onClick={() => window.open('/help?section=ai-workflows', '_blank')}
            title="AI Workflow Help"
          >
            <Sparkles size={16} />
            AI Help
          </button>
          <button
            className={`btn ${currentWorkflow?.active ? 'btn-success' : 'btn-secondary'}`}
            onClick={handleToggleActive}
            disabled={isTogglingActive || !currentWorkflow}
            title={currentWorkflow?.active ? 'Deactivate workflow' : 'Activate workflow'}
          >
            <Power size={16} />
            {isTogglingActive ? '...' : currentWorkflow?.active ? 'Active' : 'Inactive'}
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => setShowCredentials(true)}
            title="Manage credentials"
          >
            <Key size={16} />
            Credentials
          </button>
          <button
            className={`btn ${showResults ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setShowResults(!showResults)}
            title="View execution results"
          >
            <Terminal size={16} />
            {showResults ? 'Hide Results' : 'Results'}
          </button>
          <button
            className="btn btn-secondary"
            onClick={handleSave}
            disabled={isSaving}
          >
            <Save size={16} />
            {isSaving ? 'Saving...' : 'Save'}
          </button>
          {activeExecutionId ? (
            <button
              className="btn btn-danger"
              onClick={handleCancel}
            >
              <Square size={16} />
              Stop
            </button>
          ) : (
            <button
              className="btn btn-primary"
              onClick={handleExecute}
              disabled={isExecuting}
            >
              <Play size={16} />
              {isExecuting ? 'Running...' : 'Execute'}
            </button>
          )}
        </div>
      </div>

      <div className="editor-content">
        <NodePanel nodeTypes={nodeTypesList} />

        <div className="canvas-container">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onNodesDelete={onNodesDelete}
            onEdgesDelete={onEdgesDelete}
            nodeTypes={nodeTypes}
            fitView
            deleteKeyCode={['Backspace', 'Delete']}
          >
            <Background color="#94a3b8" gap={16} size={1} />
            <Controls />
            <MiniMap
              nodeStrokeWidth={3}
              zoomable
              pannable
            />
            <Panel position="top-center">
              <div className="canvas-hint">
                Drag nodes from the panel, connect them, and configure
              </div>
            </Panel>
          </ReactFlow>
        </div>

        {selectedNode && !showResults && (
          <div 
            className="config-panel-wrapper"
            style={{ width: configPanelWidth }}
          >
            <div 
              className={`resize-handle ${isResizing ? 'resizing' : ''}`}
              onMouseDown={handleResizeStart}
              title="Drag to resize"
            />
            <NodeConfigPanel
              nodeId={selectedNode}
              onParameterChange={handleParameterChange}
            />
          </div>
        )}

        {showResults && currentWorkflow && (
          <ExecutionResults
            workflowId={currentWorkflow.id}
            onClose={() => setShowResults(false)}
          />
        )}
      </div>

      <CredentialsManager
        isOpen={showCredentials}
        onClose={() => setShowCredentials(false)}
      />
    </div>
  );
}

export function WorkflowEditor() {
  return (
    <ReactFlowProvider>
      <Flow />
    </ReactFlowProvider>
  );
}
