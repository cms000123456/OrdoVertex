import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  Plus, 
  Users, 
  Settings, 
  Trash2, 
  FolderOpen,
  MoreVertical,
  X,
  ChevronRight,
  UserPlus,
  Shield,
  Edit,
  Eye
} from 'lucide-react';
import toast from 'react-hot-toast';
import { workspacesApi } from '../services/api';
import './WorkspaceManager.css';
import { getErrorMessage, getAxiosErrorData } from '../utils/error-helper';

interface Workspace {
  id: string;
  name: string;
  description?: string;
  slug: string;
  owner: { id: string; name: string; email: string };
  members: Array<{
    id: string;
    role: string;
    user: { id: string; name: string; email: string };
  }>;
  _count: { workflows: number; members: number };
  createdAt: string;
}

export function WorkspaceManager() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState<string | null>(null);
  const [newWorkspace, setNewWorkspace] = useState({ name: '', description: '' });
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('viewer');

  useEffect(() => {
    if (id) {
      loadWorkspace(id);
    } else {
      loadWorkspaces();
    }
  }, [id]);

  const loadWorkspaces = async () => {
    try {
      const response = await workspacesApi.getAll();
      setWorkspaces(response.data.data?.workspaces || response.data.data || []);
    } catch (error) {
      toast.error('Failed to load workspaces');
    } finally {
      setIsLoading(false);
    }
  };

  const loadWorkspace = async (workspaceId: string) => {
    try {
      const response = await workspacesApi.getById(workspaceId);
      setCurrentWorkspace(response.data.data);
    } catch (error) {
      toast.error('Failed to load workspace');
      navigate('/workspaces');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await workspacesApi.create(newWorkspace);
      toast.success('Workspace created');
      setShowCreateModal(false);
      setNewWorkspace({ name: '', description: '' });
      loadWorkspaces();
    } catch (error) {
      toast.error('Failed to create workspace');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure? This will delete all workflows in this workspace.')) return;
    try {
      await workspacesApi.delete(id);
      toast.success('Workspace deleted');
      loadWorkspaces();
    } catch (error) {
      toast.error('Failed to delete workspace');
    }
  };

  const handleAddMember = async (workspaceId: string) => {
    try {
      await workspacesApi.addMember(workspaceId, {
        email: newMemberEmail,
        role: newMemberRole
      });
      toast.success('Member added');
      setNewMemberEmail('');
      loadWorkspaces();
    } catch (error: unknown) {
      toast.error(getAxiosErrorData(error)?.error || getErrorMessage(error) || 'Failed to add member');
    }
  };

  const handleRemoveMember = async (workspaceId: string, memberId: string) => {
    if (!window.confirm('Remove this member?')) return;
    try {
      await workspacesApi.removeMember(workspaceId, memberId);
      toast.success('Member removed');
      loadWorkspaces();
    } catch (error) {
      toast.error('Failed to remove member');
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return <Shield size={14} className="role-owner" />;
      case 'admin': return <Settings size={14} className="role-admin" />;
      case 'editor': return <Edit size={14} className="role-editor" />;
      default: return <Eye size={14} className="role-viewer" />;
    }
  };

  if (isLoading) {
    return <div className="workspace-manager loading">Loading workspaces...</div>;
  }

  // Detail view for single workspace
  if (id && currentWorkspace) {
    return (
      <div className="workspace-manager">
        <div className="page-header">
          <button className="btn btn-secondary" onClick={() => navigate('/workspaces')}>
            ← Back to Workspaces
          </button>
          <h1>{currentWorkspace.name}</h1>
          <button 
            className="btn btn-primary" 
            onClick={() => setShowMembersModal(currentWorkspace.id)}
          >
            <UserPlus size={18} />
            Invite Member
          </button>
        </div>

        <div className="workspace-detail">
          <div className="detail-section">
            <h2>Details</h2>
            <p><strong>Slug:</strong> {currentWorkspace.slug}</p>
            <p><strong>Description:</strong> {currentWorkspace.description || 'No description'}</p>
            <p><strong>Owner:</strong> {currentWorkspace.owner.name || currentWorkspace.owner.email}</p>
            <p><strong>Created:</strong> {new Date(currentWorkspace.createdAt).toLocaleDateString()}</p>
          </div>

          <div className="detail-section">
            <h2>Members ({currentWorkspace.members.length})</h2>
            <div className="members-list">
              {currentWorkspace.members.map(member => (
                <div key={member.id} className="member-item">
                  <div className="member-info">
                    <span className="member-name">{member.user.name || member.user.email}</span>
                    <span className="member-email">{member.user.email}</span>
                  </div>
                  <span className={`member-role role-${member.role}`}>
                    {getRoleIcon(member.role)}
                    {member.role}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="detail-section">
            <h2>Workflows ({currentWorkspace._count?.workflows ?? 0})</h2>
            <p>Workflows in this workspace are listed below. Use the main Workflows page to manage them.</p>
          </div>
        </div>

        {/* Members Modal */}
        {showMembersModal === currentWorkspace.id && (
          <div className="modal-overlay" onClick={() => setShowMembersModal(null)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Manage Members</h3>
                <button className="close-btn" onClick={() => setShowMembersModal(null)}>
                  <X size={20} />
                </button>
              </div>
              
              <div className="add-member-form">
                <h4>Add New Member</h4>
                <div className="form-row">
                  <input
                    type="email"
                    placeholder="Enter email address"
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                    className="form-input"
                  />
                  <select
                    value={newMemberRole}
                    onChange={(e) => setNewMemberRole(e.target.value)}
                    className="form-select"
                  >
                    <option value="viewer">Viewer</option>
                    <option value="editor">Editor</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button 
                    className="btn btn-primary"
                    onClick={() => handleAddMember(currentWorkspace.id)}
                    disabled={!newMemberEmail}
                  >
                    <UserPlus size={16} />
                    Add
                  </button>
                </div>
              </div>

              <div className="members-list-modal">
                <h4>Current Members</h4>
                {currentWorkspace.members.map(member => (
                  <div key={member.id} className="member-row">
                    <div className="member-info">
                      <strong>{member.user.name || member.user.email}</strong>
                      <span className="member-email">{member.user.email}</span>
                    </div>
                    <span className={`member-role role-${member.role}`}>
                      {getRoleIcon(member.role)}
                      {member.role}
                    </span>
                    {member.user.id !== currentWorkspace.owner.id && (
                      <button 
                        className="btn btn-sm btn-danger"
                        onClick={() => handleRemoveMember(currentWorkspace.id, member.id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="workspace-manager">
      <div className="page-header">
        <h1>Workspaces</h1>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          <Plus size={18} />
          New Workspace
        </button>
      </div>

      {workspaces.length === 0 ? (
        <div className="empty-state">
          <FolderOpen size={48} className="empty-icon" />
          <h2>No workspaces yet</h2>
          <p>Create a workspace to share workflows with your team</p>
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            <Plus size={18} />
            Create Workspace
          </button>
        </div>
      ) : (
        <div className="workspaces-grid">
          {workspaces.map(workspace => (
            <div 
              key={workspace.id} 
              className="workspace-card"
              onClick={() => navigate(`/workspaces/${workspace.id}`)}
              style={{ cursor: 'pointer' }}
            >
              <div className="workspace-header">
                <div className="workspace-icon">
                  <FolderOpen size={24} />
                </div>
                <div className="workspace-info">
                  <h3>{workspace.name}</h3>
                  <p className="workspace-slug">/{workspace.slug}</p>
                </div>
                <div className="workspace-actions">
                  <button 
                    className="action-btn"
                    onClick={() => setShowMembersModal(workspace.id)}
                    title="Manage members"
                  >
                    <Users size={16} />
                  </button>
                  {workspace.owner.id === workspace.members.find(m => m.user.id === workspace.owner.id)?.user.id && (
                    <button 
                      className="action-btn danger"
                      onClick={() => handleDelete(workspace.id)}
                      title="Delete workspace"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>

              {workspace.description && (
                <p className="workspace-description">{workspace.description}</p>
              )}

              <div className="workspace-stats">
                <span className="stat">
                  <FolderOpen size={14} />
                  {workspace._count?.workflows ?? 0} workflows
                </span>
                <span className="stat">
                  <Users size={14} />
                  {workspace._count?.members ?? 0} members
                </span>
              </div>

              <div className="workspace-members-preview">
                {workspace.members.slice(0, 3).map(member => (
                  <div key={member.id} className="member-avatar" title={`${member.user.name || member.user.email} (${member.role})`}>
                    {(member.user.name || member.user.email)[0].toUpperCase()}
                  </div>
                ))}
                {workspace.members.length > 3 && (
                  <div className="member-avatar more">+{workspace.members.length - 3}</div>
                )}
              </div>

              <button 
                className="btn btn-secondary btn-sm"
                onClick={() => navigate(`/workspaces/${workspace.id}`)}
              >
                Open Workspace
                <ChevronRight size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Create New Workspace</h2>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label>Name *</label>
                <input
                  type="text"
                  value={newWorkspace.name}
                  onChange={e => setNewWorkspace({ ...newWorkspace, name: e.target.value })}
                  placeholder="My Team Workspace"
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={newWorkspace.description}
                  onChange={e => setNewWorkspace({ ...newWorkspace, description: e.target.value })}
                  placeholder="What this workspace is for..."
                  rows={3}
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={!newWorkspace.name.trim()}>
                  Create Workspace
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showMembersModal && (
        <div className="modal-overlay" onClick={() => setShowMembersModal(null)}>
          <div className="modal modal-large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Workspace Members</h2>
              <button className="close-btn" onClick={() => setShowMembersModal(null)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="add-member-section">
              <h3>Add Member</h3>
              <div className="add-member-form">
                <input
                  type="email"
                  placeholder="user@example.com"
                  value={newMemberEmail}
                  onChange={e => setNewMemberEmail(e.target.value)}
                />
                <select value={newMemberRole} onChange={e => setNewMemberRole(e.target.value)}>
                  <option value="viewer">Viewer (can view only)</option>
                  <option value="editor">Editor (can edit workflows)</option>
                  <option value="admin">Admin (can manage members)</option>
                </select>
                <button 
                  className="btn btn-primary"
                  onClick={() => handleAddMember(showMembersModal)}
                  disabled={!newMemberEmail}
                >
                  <UserPlus size={16} />
                  Add
                </button>
              </div>
            </div>

            <div className="members-list">
              <h3>Current Members</h3>
              {workspaces.find(w => w.id === showMembersModal)?.members.map(member => (
                <div key={member.id} className="member-item">
                  <div className="member-info">
                    <div className="member-avatar">
                      {(member.user.name || member.user.email)[0].toUpperCase()}
                    </div>
                    <div className="member-details">
                      <span className="member-name">{member.user.name || 'Unnamed'}</span>
                      <span className="member-email">{member.user.email}</span>
                    </div>
                  </div>
                  <div className="member-role">
                    {getRoleIcon(member.role)}
                    <span className={`role-badge role-${member.role}`}>{member.role}</span>
                  </div>
                  {member.role !== 'owner' && (
                    <button 
                      className="action-btn danger"
                      onClick={() => handleRemoveMember(showMembersModal, member.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
