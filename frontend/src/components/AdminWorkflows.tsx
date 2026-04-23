import React, { useEffect, useState } from 'react';
import { Workflow, Search, Loader2, Trash2, Power, AlertCircle, User, Building2, Play, Calendar, ExternalLink, Move, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminApi, workspacesApi } from '../services/api';
import './UserManagement.css';
import { getErrorMessage, getAxiosErrorData } from '../utils/error-helper';

interface WorkflowData {
  id: string;
  name: string;
  description?: string;
  active: boolean;
  userId: string;
  workspaceId?: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    email: string;
    name?: string;
  };
  workspace?: {
    id: string;
    name: string;
  };
  _count: {
    executions: number;
  };
}

export function AdminWorkflows() {
  const [workflows, setWorkflows] = useState<WorkflowData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    loadWorkflows();
  }, []);

  const loadWorkflows = async () => {
    setIsLoading(true);
    try {
      const response = await adminApi.getAllWorkflows();
      setWorkflows(response.data.data || []);
    } catch (error: unknown) {
      toast.error(getAxiosErrorData(error)?.error || getErrorMessage(error) || 'Failed to load workflows');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (workflowId: string, workflowName: string) => {
    if (!window.confirm(`Are you sure you want to delete "${workflowName}"? This action cannot be undone.`)) {
      return;
    }

    setDeletingId(workflowId);
    try {
      await adminApi.deleteWorkflow(workflowId);
      toast.success('Workflow deleted successfully');
      setWorkflows(workflows.filter(w => w.id !== workflowId));
    } catch (error: unknown) {
      toast.error(getAxiosErrorData(error)?.error || getErrorMessage(error) || 'Failed to delete workflow');
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggle = async (workflowId: string) => {
    setTogglingId(workflowId);
    try {
      const response = await adminApi.toggleWorkflow(workflowId);
      const updated = response.data.data;
      setWorkflows(workflows.map(w => w.id === workflowId ? updated : w));
      toast.success(`Workflow ${updated.active ? 'activated' : 'deactivated'}`);
    } catch (error: unknown) {
      toast.error(getAxiosErrorData(error)?.error || getErrorMessage(error) || 'Failed to toggle workflow');
    } finally {
      setTogglingId(null);
    }
  };

  const filteredWorkflows = workflows.filter(workflow =>
    workflow.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    workflow.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    workflow.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    workflow.user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    workflow.workspace?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeCount = workflows.filter(w => w.active).length;
  const inactiveCount = workflows.length - activeCount;
  
  // Move workflow state
  const [movingId, setMovingId] = useState<string | null>(null);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowData | null>(null);
  const [targetWorkspaceId, setTargetWorkspaceId] = useState<string>('');
  const [workspaces, setWorkspaces] = useState<{ id: string; name: string }[]>([]);

  const handleMoveClick = async (workflow: WorkflowData) => {
    setSelectedWorkflow(workflow);
    setTargetWorkspaceId(workflow.workspaceId || '');
    setShowMoveModal(true);
    
    // Load workspaces
    try {
      const response = await workspacesApi.getAll();
      setWorkspaces(response.data.data || []);
    } catch (err) {
      toast.error('Failed to load workspaces');
    }
  };

  const handleMove = async () => {
    if (!selectedWorkflow) return;
    
    setMovingId(selectedWorkflow.id);
    try {
      const response = await adminApi.moveWorkflow(
        selectedWorkflow.id, 
        targetWorkspaceId || null
      );
      const updated = response.data.data;
      setWorkflows(workflows.map(w => w.id === selectedWorkflow.id ? updated : w));
      toast.success(response.data.message);
      setShowMoveModal(false);
      setSelectedWorkflow(null);
      setTargetWorkspaceId('');
    } catch (error: unknown) {
      toast.error(getAxiosErrorData(error)?.error || getErrorMessage(error) || 'Failed to move workflow');
    } finally {
      setMovingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="user-management">
        <div className="loading-container">
          <Loader2 size={32} className="spinner" />
          <p>Loading workflows...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="user-management">
      <div className="page-header">
        <div className="header-title">
          <Workflow size={28} />
          <h1>All Workflows</h1>
        </div>
      </div>

      <div className="header-stats">
        <div className="stat-card">
          <span className="stat-value">{workflows.length}</span>
          <span className="stat-label">Total Workflows</span>
        </div>
        <div className="stat-card">
          <span className="stat-value" style={{ color: '#10b981' }}>{activeCount}</span>
          <span className="stat-label">Active</span>
        </div>
        <div className="stat-card">
          <span className="stat-value" style={{ color: '#64748b' }}>{inactiveCount}</span>
          <span className="stat-label">Inactive</span>
        </div>
      </div>

      <div className="search-bar">
        <Search size={18} />
        <input
          type="text"
          placeholder="Search workflows by name, description, owner, or workspace..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="users-table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>Workflow</th>
              <th>Owner</th>
              <th>Workspace</th>
              <th>Status</th>
              <th>Executions</th>
              <th>Last Updated</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredWorkflows.length === 0 ? (
              <tr>
                <td colSpan={7} className="empty-state">
                  <AlertCircle size={24} />
                  <p>{searchTerm ? 'No workflows found matching your search' : 'No workflows found'}</p>
                </td>
              </tr>
            ) : (
              filteredWorkflows.map((workflow) => (
                <tr key={workflow.id}>
                  <td className="user-cell">
                    <div className="user-avatar" style={{ background: workflow.active ? '#10b981' : '#64748b' }}>
                      <Workflow size={16} />
                    </div>
                    <div className="user-info">
                      <span className="user-name">{workflow.name}</span>
                      {workflow.description && (
                        <span className="user-email">{workflow.description}</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <User size={14} color="#94a3b8" />
                      <span>{workflow.user.name || workflow.user.email}</span>
                    </div>
                  </td>
                  <td>
                    {workflow.workspace ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Building2 size={14} color="#6366f1" />
                        <span>{workflow.workspace.name}</span>
                      </div>
                    ) : (
                      <span style={{ color: '#64748b', fontStyle: 'italic' }}>Personal</span>
                    )}
                  </td>
                  <td>
                    <span 
                      className="role-badge"
                      style={{ 
                        background: workflow.active ? 'rgba(16, 185, 129, 0.2)' : 'rgba(100, 116, 139, 0.2)',
                        color: workflow.active ? '#10b981' : '#64748b'
                      }}
                    >
                      {workflow.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="workflows-count">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Play size={14} color="#94a3b8" />
                      {workflow._count.executions}
                    </div>
                  </td>
                  <td className="date-cell">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Calendar size={14} color="#94a3b8" />
                      {formatDate(workflow.updatedAt)}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        className="btn-icon"
                        onClick={() => handleMoveClick(workflow)}
                        title="Move to workspace"
                        style={{ color: '#8b5cf6' }}
                      >
                        <Move size={16} />
                      </button>
                      <button
                        className="btn-icon"
                        onClick={() => handleToggle(workflow.id)}
                        disabled={togglingId === workflow.id}
                        title={workflow.active ? 'Deactivate' : 'Activate'}
                        style={{ 
                          color: workflow.active ? '#f59e0b' : '#10b981'
                        }}
                      >
                        {togglingId === workflow.id ? (
                          <Loader2 size={16} className="spinner" />
                        ) : (
                          <Power size={16} />
                        )}
                      </button>
                      <a
                        href={`/workflows/${workflow.id}`}
                        className="btn-icon"
                        title="Open in Editor"
                        style={{ color: '#6366f1' }}
                      >
                        <ExternalLink size={16} />
                      </a>
                      <button
                        className="btn-icon danger"
                        onClick={() => handleDelete(workflow.id, workflow.name)}
                        disabled={deletingId === workflow.id}
                        title="Delete workflow"
                      >
                        {deletingId === workflow.id ? (
                          <Loader2 size={16} className="spinner" />
                        ) : (
                          <Trash2 size={16} />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Move Workflow Modal */}
      {showMoveModal && selectedWorkflow && (
        <div 
          className="user-modal-overlay" 
          onClick={() => setShowMoveModal(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
          }}
        >
          <div 
            className="user-modal-content" 
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#1e1e2e',
              borderRadius: '12px',
              width: '90%',
              maxWidth: '480px',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
              border: '1px solid #3d3d5c'
            }}
          >
            <div 
              className="modal-header"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '20px',
                borderBottom: '1px solid #3d3d5c',
                background: '#1e1e2e'
              }}
            >
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0, fontSize: '18px', color: '#e2e8f0' }}>
                <Move size={20} />
                Move Workflow
              </h2>
              <button 
                className="close-btn" 
                onClick={() => setShowMoveModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '20px', background: '#1e1e2e' }}>
              <p style={{ marginBottom: '20px', color: '#94a3b8' }}>
                Moving: <strong style={{ color: '#e2e8f0' }}>{selectedWorkflow.name}</strong>
              </p>
              
              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500, color: '#e2e8f0' }}>
                  Target Workspace
                </label>
                <select
                  value={targetWorkspaceId}
                  onChange={(e) => setTargetWorkspaceId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: '#2d2d44',
                    border: '1px solid #3d3d5c',
                    borderRadius: '6px',
                    color: '#e2e8f0',
                    fontSize: '14px'
                  }}
                >
                  <option value="">Personal (no workspace)</option>
                  {workspaces.map(ws => (
                    <option key={ws.id} value={ws.id}>{ws.name}</option>
                  ))}
                </select>
                <p className="form-hint" style={{ marginTop: '8px', fontSize: '12px', color: '#64748b' }}>
                  Select "Personal" to move the workflow out of any workspace.
                </p>
              </div>

              <div className="form-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #3d3d5c' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowMoveModal(false)}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: '1px solid #3d3d5c',
                    background: '#2d2d44',
                    color: '#e2e8f0',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleMove}
                  disabled={movingId === selectedWorkflow.id}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#8b5cf6',
                    color: 'white',
                    cursor: movingId === selectedWorkflow.id ? 'not-allowed' : 'pointer',
                    opacity: movingId === selectedWorkflow.id ? 0.6 : 1,
                    fontSize: '14px'
                  }}
                >
                  {movingId === selectedWorkflow.id ? (
                    <>
                      <Loader2 size={16} className="spinner" style={{ animation: 'spin 1s linear infinite' }} />
                      Moving...
                    </>
                  ) : (
                    'Move Workflow'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
