import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Play, Settings, Trash2, Clock, Activity, MoreVertical, LayoutGrid, Upload, Download, Terminal, GraduationCap, ExternalLink, Move, FolderOpen, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { workflowsApi, workspacesApi } from '../services/api';
import { Workflow } from '../types';
import './WorkflowsList.css';

interface Workspace {
  id: string;
  name: string;
  slug: string;
  owner: { id: string; name?: string; email: string };
  members: Array<{ id: string; user: { id: string; name?: string; email: string }; role: string }>;
}

export function WorkflowsList() {
  const navigate = useNavigate();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [newWorkflowName, setNewWorkflowName] = useState('');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<any>(null);
  
  // Move workflow state
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workflowToMove, setWorkflowToMove] = useState<Workflow | null>(null);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>('');
  const [isMoving, setIsMoving] = useState(false);

  useEffect(() => {
    loadWorkflows();
  }, []);

  const loadWorkflows = async () => {
    try {
      const response = await workflowsApi.getAll();
      setWorkflows(response.data.data || []);
    } catch (error: any) {
      console.error('Load workflows error:', error);
      toast.error('Failed to load workflows: ' + (error.message || 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };

  // Load workspaces for display
  const [userWorkspaces, setUserWorkspaces] = useState<Workspace[]>([]);
  useEffect(() => {
    const loadWorkspaces = async () => {
      try {
        const response = await workspacesApi.getAll();
        setUserWorkspaces(response.data.data || []);
      } catch (error) {
        console.error('Failed to load workspaces:', error);
      }
    };
    loadWorkspaces();
  }, []);

  const getWorkspaceName = (workspaceId?: string) => {
    if (!workspaceId) return null;
    const workspace = userWorkspaces.find(w => w.id === workspaceId);
    return workspace?.name;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkflowName.trim()) return;

    try {
      const response = await workflowsApi.create({
        name: newWorkflowName,
        nodes: [],
        connections: []
      });
      toast.success('Workflow created');
      navigate(`/workflows/${response.data.data.id}`);
    } catch (error) {
      toast.error('Failed to create workflow');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this workflow?')) return;

    try {
      await workflowsApi.delete(id);
      toast.success('Workflow deleted');
      loadWorkflows();
    } catch (error) {
      toast.error('Failed to delete workflow');
    }
  };

  const handleExport = async (workflow: Workflow) => {
    try {
      const response = await workflowsApi.export(workflow.id);
      const blob = new Blob([response.data], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${workflow.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_workflow.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Workflow exported');
    } catch (error) {
      toast.error('Failed to export workflow');
    }
  };

  const handleImportFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFile(file);
    
    try {
      const content = await file.text();
      const data = JSON.parse(content);
      
      // Validate the import
      const response = await workflowsApi.validateImport({ workflow: data.workflow || data });
      setImportPreview(response.data.data);
    } catch (error) {
      toast.error('Invalid workflow file');
      setImportPreview(null);
    }
  };

  const handleImport = async () => {
    if (!importFile || !importPreview) return;

    try {
      const content = await importFile.text();
      const data = JSON.parse(content);
      
      await workflowsApi.import({
        workflow: data.workflow || data,
        name: importPreview.name
      });
      
      toast.success('Workflow imported successfully');
      setShowImportModal(false);
      setImportFile(null);
      setImportPreview(null);
      loadWorkflows();
    } catch (error) {
      toast.error('Failed to import workflow');
    }
  };

  const handleExecute = async (id: string) => {
    try {
      await workflowsApi.execute(id);
      toast.success('Workflow execution started');
    } catch (error) {
      toast.error('Failed to start execution');
    }
  };

  const openMoveModal = async (workflow: Workflow) => {
    setWorkflowToMove(workflow);
    setSelectedWorkspaceId('');
    setShowMoveModal(true);
    
    try {
      const response = await workspacesApi.getAll();
      // Filter workspaces where user has editor/admin/owner permissions
      const accessibleWorkspaces = response.data.data?.filter((w: Workspace) => {
        const isOwner = w.owner.id === workflow.userId;
        const member = w.members.find(m => m.user.id === workflow.userId);
        const hasEditPermission = member && ['admin', 'editor'].includes(member.role);
        return isOwner || hasEditPermission;
      }) || [];
      setWorkspaces(accessibleWorkspaces);
    } catch (error) {
      toast.error('Failed to load workspaces');
    }
  };

  const handleMove = async () => {
    if (!workflowToMove) return;
    
    setIsMoving(true);
    try {
      const workspaceId = selectedWorkspaceId === '' ? null : selectedWorkspaceId;
      await workflowsApi.moveToWorkspace(workflowToMove.id, workspaceId);
      toast.success(workspaceId 
        ? 'Workflow moved to workspace' 
        : 'Workflow moved to personal workflows'
      );
      setShowMoveModal(false);
      setWorkflowToMove(null);
      loadWorkflows();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to move workflow');
    } finally {
      setIsMoving(false);
    }
  };

  const getStatusIcon = (active: boolean) => {
    return active ? (
      <span className="status-badge active">Active</span>
    ) : (
      <span className="status-badge inactive">Inactive</span>
    );
  };

  if (isLoading) {
    return (
      <div className="workflows-list">
        <div className="loading">Loading workflows...</div>
      </div>
    );
  }

  return (
    <div className="workflows-list">
      <div className="page-header">
        <h1>Workflows</h1>
        <div className="header-actions">
          <button
            className="btn btn-secondary"
            onClick={() => navigate('/admin/execution-logs')}
          >
            <Terminal size={18} />
            Logs
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => setShowImportModal(true)}
          >
            <Upload size={18} />
            Import
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => navigate('/workflows/new')}
          >
            <LayoutGrid size={18} />
            From Template
          </button>
          <button
            className="btn btn-primary"
            onClick={() => setShowNewModal(true)}
          >
            <Plus size={18} />
            New Workflow
          </button>
        </div>
      </div>

      {workflows.length === 0 ? (
        <div className="empty-state">
          <Activity size={48} className="empty-icon" />
          <h2>No workflows yet</h2>
          <p>Create your first workflow to get started</p>
          <div className="empty-actions">
            <button
              className="btn btn-secondary"
              onClick={() => navigate('/workflows/new')}
            >
              <LayoutGrid size={18} />
              From Template
            </button>
            <button
              className="btn btn-primary"
              onClick={() => setShowNewModal(true)}
            >
              <Plus size={18} />
              Create Workflow
            </button>
          </div>
        </div>
      ) : (
        <div className="workflows-grid">
          {workflows.map((workflow) => {
            const isTutorial = workflow.name.toLowerCase().includes('tutorial') || 
                              workflow.name.includes('📚');
            return (
            <div key={workflow.id} className={`workflow-card ${isTutorial ? 'tutorial-card' : ''}`}>
              <div className="card-header">
                <h3 onClick={() => navigate(`/workflows/${workflow.id}`)}>
                  {workflow.name}
                </h3>
                <div className="header-badges">
                  {isTutorial && (
                    <span className="tutorial-badge" title="Tutorial workflow - learn by example!">
                      <GraduationCap size={14} />
                      Tutorial
                    </span>
                  )}
                  {getStatusIcon(workflow.active)}
                </div>
              </div>
              
              <p className="workflow-description">
                {workflow.description || 'No description'}
              </p>

              <div className="workflow-meta">
                <span className="meta-item">
                  <Activity size={14} />
                  {workflow._count?.executions || 0} executions
                </span>
                <span className="meta-item">
                  <Clock size={14} />
                  {new Date(workflow.updatedAt).toLocaleDateString()}
                </span>
                {getWorkspaceName(workflow.workspaceId) && (
                  <span className="meta-item workspace-badge">
                    <FolderOpen size={14} />
                    {getWorkspaceName(workflow.workspaceId)}
                  </span>
                )}
              </div>

              <div className="card-actions">
                <button
                  className="action-btn"
                  onClick={() => handleExecute(workflow.id)}
                  title="Execute"
                >
                  <Play size={16} />
                </button>
                <button
                  className="action-btn"
                  onClick={() => navigate(`/workflows/${workflow.id}`)}
                  title="Edit"
                >
                  <Settings size={16} />
                </button>
                <button
                  className="action-btn"
                  onClick={() => openMoveModal(workflow)}
                  title="Move to Workspace"
                >
                  <Move size={16} />
                </button>
                <button
                  className="action-btn"
                  onClick={() => handleExport(workflow)}
                  title="Export"
                >
                  <Download size={16} />
                </button>
                <button
                  className="action-btn danger"
                  onClick={() => handleDelete(workflow.id)}
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          )})}
        </div>
      )}

      {showNewModal && (
        <div className="modal-overlay" onClick={() => setShowNewModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Create New Workflow</h2>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label>Name</label>
                <input
                  type="text"
                  value={newWorkflowName}
                  onChange={(e) => setNewWorkflowName(e.target.value)}
                  placeholder="Enter workflow name..."
                  autoFocus
                />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowNewModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!newWorkflowName.trim()}
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showImportModal && (
        <div className="modal-overlay" onClick={() => setShowImportModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Import Workflow</h2>
            <div className="form-group">
              <label>Select JSON file</label>
              <input
                type="file"
                accept=".json"
                onChange={handleImportFileChange}
              />
            </div>
            
            {importPreview && (
              <div className="import-preview">
                <h4>Preview</h4>
                <p><strong>Name:</strong> {importPreview.name}</p>
                <p><strong>Description:</strong> {importPreview.description || 'None'}</p>
                <p><strong>Nodes:</strong> {importPreview.nodeCount}</p>
                <p><strong>Connections:</strong> {importPreview.connectionCount}</p>
              </div>
            )}
            
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setShowImportModal(false);
                  setImportFile(null);
                  setImportPreview(null);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleImport}
                disabled={!importPreview}
              >
                Import
              </button>
            </div>
          </div>
        </div>
      )}

      {showMoveModal && workflowToMove && (
        <div className="modal-overlay" onClick={() => setShowMoveModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Move Workflow</h2>
              <button 
                className="close-btn" 
                onClick={() => setShowMoveModal(false)}
              >
                <X size={20} />
              </button>
            </div>
            
            <p className="move-workflow-info">
              Moving: <strong>{workflowToMove.name}</strong>
            </p>
            
            <div className="form-group">
              <label>Select Destination</label>
              <select
                value={selectedWorkspaceId}
                onChange={(e) => setSelectedWorkspaceId(e.target.value)}
                className="workspace-select"
              >
                <option value="">Personal Workflows (no workspace)</option>
                {workspaces.map((workspace) => (
                  <option key={workspace.id} value={workspace.id}>
                    {workspace.name} /{workspace.slug}
                  </option>
                ))}
              </select>
              {workspaces.length === 0 && (
                <p className="hint-text">
                  No workspaces with editor permissions available. 
                  Create a workspace or ask to be added as an editor.
                </p>
              )}
            </div>
            
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowMoveModal(false)}
                disabled={isMoving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleMove}
                disabled={isMoving}
              >
                {isMoving ? 'Moving...' : 'Move Workflow'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
