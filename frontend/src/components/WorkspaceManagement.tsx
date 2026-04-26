import React, { useEffect, useState } from 'react';
import { Building2, Plus, X, Trash2, Edit2, Save, UserPlus, Loader2, AlertCircle, Users, UsersRound, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { workspacesApi, groupsApi, usersApi } from '../services/api';
import './UserManagement.css';
import { getErrorMessage, getAxiosErrorData } from '../utils/error-helper';

interface Workspace {
  id: string;
  name: string;
  description?: string;
  slug: string;
  ownerId: string;
  owner: {
    id: string;
    email: string;
    name?: string;
  };
  members: {
    id: string;
    userId: string;
    user: {
      id: string;
      email: string;
      name?: string;
    };
    role: string;
  }[];
  _count?: {
    workflows: number;
    members: number;
  };
  createdAt: string;
  updatedAt: string;
}

interface Group {
  id: string;
  name: string;
  description?: string;
  workspaceAccess?: {
    id: string;
    workspaceId: string;
    role: string;
  }[];
}

export function WorkspaceManagement() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingWorkspace, setDeletingWorkspace] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [creatingWorkspace, setCreatingWorkspace] = useState(false);
  const [editingWorkspace, setEditingWorkspace] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [expandedWorkspace, setExpandedWorkspace] = useState<string | null>(null);
  
  // Member management
  const [showAddMember, setShowAddMember] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('viewer');
  const [addingMember, setAddingMember] = useState(false);
  
  // All users for selection
  const [allUsers, setAllUsers] = useState<{ id: string; email: string; name?: string }[]>([]);
  
  // Group assignment
  const [showAssignGroup, setShowAssignGroup] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [groupRole, setGroupRole] = useState('viewer');
  const [assigningGroup, setAssigningGroup] = useState(false);

  // Form state for adding workspace
  const [newWorkspace, setNewWorkspace] = useState({
    name: '',
    description: ''
  });

  useEffect(() => {
    loadWorkspaces();
    loadGroups();
    loadAllUsers();
  }, []);

  const loadAllUsers = async () => {
    try {
      const response = await usersApi.getAll();
      const users = response.data?.data?.users || [];
      setAllUsers(users.map((u: any) => ({ id: u.id, email: u.email, name: u.name })));
    } catch (err) {
      console.error('Failed to load users:', err);
    }
  };

  const loadWorkspaces = async () => {
    setIsLoading(true);
    try {
      const response = await workspacesApi.getAll();
      setWorkspaces(response.data.data?.workspaces || response.data.data || []);
    } catch (error: unknown) {
      toast.error((getAxiosErrorData(error)?.message || getErrorMessage(error)) || 'Failed to load workspaces');
    } finally {
      setIsLoading(false);
    }
  };

  const loadGroups = async () => {
    try {
      const response = await groupsApi.getAll();
      setGroups(response.data?.data || []);
    } catch (error: unknown) {
      console.error('Failed to load groups:', error);
    }
  };

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newWorkspace.name.trim()) {
      toast.error('Workspace name is required');
      return;
    }

    setCreatingWorkspace(true);
    try {
      const response = await workspacesApi.create({
        name: newWorkspace.name,
        description: newWorkspace.description || undefined
      });
      toast.success('Workspace created successfully');
      setWorkspaces([response.data.data, ...workspaces]);
      setShowAddModal(false);
      setNewWorkspace({ name: '', description: '' });
    } catch (error: unknown) {
      toast.error(getAxiosErrorData(error)?.error || getErrorMessage(error) || 'Failed to create workspace');
    } finally {
      setCreatingWorkspace(false);
    }
  };

  const handleDelete = async (workspaceId: string) => {
    if (!window.confirm('Are you sure you want to delete this workspace? This action cannot be undone.')) {
      return;
    }

    setDeletingWorkspace(workspaceId);
    try {
      await workspacesApi.delete(workspaceId);
      toast.success('Workspace deleted successfully');
      setWorkspaces(workspaces.filter(w => w.id !== workspaceId));
    } catch (error: unknown) {
      toast.error(getAxiosErrorData(error)?.error || getErrorMessage(error) || 'Failed to delete workspace');
    } finally {
      setDeletingWorkspace(null);
    }
  };

  const handleUpdate = async (workspaceId: string) => {
    try {
      await workspacesApi.update(workspaceId, {
        name: editName,
        description: editDescription
      });
      toast.success('Workspace updated successfully');
      setWorkspaces(workspaces.map(w => 
        w.id === workspaceId 
          ? { ...w, name: editName, description: editDescription }
          : w
      ));
      setEditingWorkspace(null);
    } catch (error: unknown) {
      toast.error(getAxiosErrorData(error)?.error || getErrorMessage(error) || 'Failed to update workspace');
    }
  };

  const handleAddMember = async (workspaceId: string, workspaceMembers: any[]) => {
    if (!selectedUserId) {
      toast.error('Please select a user');
      return;
    }

    // Check if user is already a member
    const isAlreadyMember = workspaceMembers.some(m => m.userId === selectedUserId);
    if (isAlreadyMember) {
      toast.error('User is already a member of this workspace');
      return;
    }

    const selectedUser = allUsers.find(u => u.id === selectedUserId);
    if (!selectedUser) {
      toast.error('User not found');
      return;
    }

    setAddingMember(true);
    try {
      await workspacesApi.addMember(workspaceId, {
        email: selectedUser.email,
        role: newMemberRole
      });
      toast.success('Member added successfully');
      setShowAddMember(null);
      setSelectedUserId('');
      setNewMemberRole('viewer');
      loadWorkspaces();
    } catch (error: unknown) {
      toast.error(getAxiosErrorData(error)?.error || getErrorMessage(error) || 'Failed to add member');
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = async (workspaceId: string, memberId: string) => {
    if (!window.confirm('Remove this member from the workspace?')) return;
    
    try {
      await workspacesApi.removeMember(workspaceId, memberId);
      toast.success('Member removed');
      loadWorkspaces();
    } catch (error: unknown) {
      toast.error(getAxiosErrorData(error)?.error || getErrorMessage(error) || 'Failed to remove member');
    }
  };

  const handleAssignGroup = async (workspaceId: string) => {
    if (!selectedGroup) {
      toast.error('Please select a group');
      return;
    }

    setAssigningGroup(true);
    try {
      await groupsApi.addWorkspaceAccess(selectedGroup, workspaceId, groupRole);
      toast.success('Group assigned to workspace');
      setShowAssignGroup(null);
      setSelectedGroup('');
      setGroupRole('viewer');
      loadGroups();
    } catch (error: unknown) {
      toast.error(getAxiosErrorData(error)?.error || getErrorMessage(error) || 'Failed to assign group');
    } finally {
      setAssigningGroup(false);
    }
  };

  const handleRemoveGroupAccess = async (groupId: string, accessId: string, groupName: string) => {
    if (!window.confirm(`Remove workspace access for group "${groupName}"?`)) return;
    
    try {
      await groupsApi.removeWorkspaceAccess(groupId, accessId);
      toast.success('Group access removed');
      loadGroups();
    } catch (error: unknown) {
      toast.error(getAxiosErrorData(error)?.error || getErrorMessage(error) || 'Failed to remove group access');
    }
  };

  const getAssignedGroups = (workspaceId: string) => {
    return groups.filter(g => 
      g.workspaceAccess?.some(wa => wa.workspaceId === workspaceId)
    );
  };

  const filteredWorkspaces = workspaces.filter(workspace =>
    workspace.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    workspace.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner': return '#f59e0b';
      case 'admin': return '#ef4444';
      case 'editor': return '#6366f1';
      case 'viewer': return '#10b981';
      default: return '#64748b';
    }
  };

  if (isLoading) {
    return (
      <div className="user-management">
        <div className="loading-container">
          <Loader2 size={32} className="spinner" />
          <p>Loading workspaces...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="user-management">
      <div className="page-header">
        <div className="header-title">
          <Building2 size={28} />
          <h1>Workspace Management</h1>
        </div>
        <div className="header-actions">
          <button
            className="btn btn-primary"
            onClick={() => setShowAddModal(true)}
          >
            <Plus size={18} />
            Create Workspace
          </button>
        </div>
      </div>

      <div className="header-stats">
        <div className="stat-card">
          <span className="stat-value">{workspaces.length}</span>
          <span className="stat-label">Total Workspaces</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">
            {workspaces.reduce((acc, w) => acc + (w._count?.members || 0), 0)}
          </span>
          <span className="stat-label">Total Members</span>
        </div>
      </div>

      <div className="search-bar">
        <AlertCircle size={18} />
        <input
          type="text"
          placeholder="Search workspaces by name or description..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="workspaces-list">
        {filteredWorkspaces.length === 0 ? (
          <div className="empty-state" style={{ padding: '40px', textAlign: 'center' }}>
            <Building2 size={48} style={{ opacity: 0.5, marginBottom: '16px' }} />
            <p>{searchTerm ? 'No workspaces found matching your search' : 'No workspaces found'}</p>
          </div>
        ) : (
          filteredWorkspaces.map((workspace) => {
            const assignedGroups = getAssignedGroups(workspace.id);
            const isExpanded = expandedWorkspace === workspace.id;
            
            return (
              <div 
                key={workspace.id} 
                className="workspace-card"
                style={{
                  background: '#1e1e2e',
                  borderRadius: '12px',
                  border: '1px solid #3d3d5c',
                  marginBottom: '16px',
                  overflow: 'hidden'
                }}
              >
                {/* Workspace Header */}
                <div 
                  className="workspace-header"
                  style={{
                    padding: '20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer'
                  }}
                  onClick={() => setExpandedWorkspace(isExpanded ? null : workspace.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div 
                      className="workspace-icon"
                      style={{ 
                        width: '48px', 
                        height: '48px', 
                        borderRadius: '12px', 
                        background: '#6366f1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Building2 size={24} color="white" />
                    </div>
                    <div>
                      {editingWorkspace === workspace.id ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #3d3d5c', background: '#2d2d44', color: '#e2e8f0' }}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <input
                            type="text"
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            placeholder="Description"
                            style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #3d3d5c', background: '#2d2d44', color: '#e2e8f0' }}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      ) : (
                        <>
                          <h3 style={{ margin: 0, color: '#e2e8f0', fontSize: '18px' }}>{workspace.name}</h3>
                          {workspace.description && (
                            <p style={{ margin: '4px 0 0 0', color: '#94a3b8', fontSize: '14px' }}>{workspace.description}</p>
                          )}
                        </>
                      )}
                      <div style={{ display: 'flex', gap: '12px', marginTop: '8px', fontSize: '12px', color: '#64748b' }}>
                        <span>Owner: {workspace.owner.name || workspace.owner.email}</span>
                        <span>•</span>
                        <span>{workspace._count?.members || workspace.members.length} members</span>
                        <span>•</span>
                        <span>{workspace._count?.workflows || 0} workflows</span>
                        {assignedGroups.length > 0 && (
                          <>
                            <span>•</span>
                            <span>{assignedGroups.length} groups</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {editingWorkspace === workspace.id ? (
                      <>
                        <button
                          className="btn-icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUpdate(workspace.id);
                          }}
                          title="Save"
                        >
                          <Save size={18} />
                        </button>
                        <button
                          className="btn-icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingWorkspace(null);
                          }}
                          title="Cancel"
                        >
                          <X size={18} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          className="btn-icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingWorkspace(workspace.id);
                            setEditName(workspace.name);
                            setEditDescription(workspace.description || '');
                          }}
                          title="Edit"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          className="btn-icon danger"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(workspace.id);
                          }}
                          disabled={deletingWorkspace === workspace.id}
                          title="Delete workspace"
                        >
                          {deletingWorkspace === workspace.id ? (
                            <Loader2 size={18} className="spinner" />
                          ) : (
                            <Trash2 size={18} />
                          )}
                        </button>
                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </>
                    )}
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div style={{ borderTop: '1px solid #3d3d5c', padding: '20px', background: '#252535' }}>
                    {/* Members Section */}
                    <div style={{ marginBottom: '24px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <h4 style={{ margin: 0, fontSize: '14px', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Users size={16} />
                          Members ({workspace.members.length})
                        </h4>
                        <button 
                          className="btn btn-sm"
                          onClick={() => setShowAddMember(showAddMember === workspace.id ? null : workspace.id)}
                        >
                          <UserPlus size={14} />
                          Add Member
                        </button>
                      </div>

                      {/* Add Member Form */}
                      {showAddMember === workspace.id && (
                        <div style={{ 
                          background: '#1e1e2e', 
                          padding: '16px', 
                          borderRadius: '8px', 
                          marginBottom: '16px',
                          border: '1px solid #3d3d5c'
                        }}>
                          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                            <select
                              value={selectedUserId}
                              onChange={(e) => setSelectedUserId(e.target.value)}
                              style={{ 
                                flex: 1, 
                                minWidth: '200px',
                                padding: '8px 12px', 
                                borderRadius: '6px', 
                                border: '1px solid #3d3d5c', 
                                background: '#2d2d44', 
                                color: '#e2e8f0' 
                              }}
                            >
                              <option value="">Select user...</option>
                              {allUsers
                                .filter(u => u.id !== workspace.ownerId && !workspace.members.some(m => m.userId === u.id))
                                .map(u => (
                                  <option key={u.id} value={u.id}>
                                    {u.name ? `${u.name} (${u.email})` : u.email}
                                  </option>
                                ))}
                            </select>
                            <select
                              value={newMemberRole}
                              onChange={(e) => setNewMemberRole(e.target.value)}
                              style={{ 
                                padding: '8px 12px', 
                                borderRadius: '6px', 
                                border: '1px solid #3d3d5c', 
                                background: '#2d2d44', 
                                color: '#e2e8f0' 
                              }}
                            >
                              <option value="viewer">Viewer</option>
                              <option value="editor">Editor</option>
                              <option value="admin">Admin</option>
                            </select>
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => handleAddMember(workspace.id, workspace.members)}
                              disabled={addingMember || !selectedUserId}
                            >
                              {addingMember ? <Loader2 size={14} className="spinner" /> : 'Add'}
                            </button>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => {
                                setShowAddMember(null);
                                setSelectedUserId('');
                                setNewMemberRole('viewer');
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Members List */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {/* Owner */}
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 12px',
                            background: '#1e1e2e',
                            borderRadius: '8px',
                            border: '1px solid #3d3d5c'
                          }}
                        >
                          <div style={{ 
                            width: '28px', 
                            height: '28px', 
                            borderRadius: '50%', 
                            background: '#f59e0b',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '12px',
                            fontWeight: 'bold'
                          }}>
                            {workspace.owner.name?.[0] || workspace.owner.email[0].toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontSize: '13px', color: '#e2e8f0' }}>
                              {workspace.owner.name || workspace.owner.email}
                            </div>
                            <div style={{ fontSize: '11px', color: '#f59e0b' }}>Owner</div>
                          </div>
                        </div>

                        {/* Other Members */}
                        {workspace.members.map(member => (
                          <div
                            key={member.id}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '8px 12px',
                              background: '#1e1e2e',
                              borderRadius: '8px',
                              border: '1px solid #3d3d5c'
                            }}
                          >
                            <div style={{ 
                              width: '28px', 
                              height: '28px', 
                              borderRadius: '50%', 
                              background: '#6366f1',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '12px',
                              fontWeight: 'bold'
                            }}>
                              {member.user.name?.[0] || member.user.email[0].toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontSize: '13px', color: '#e2e8f0' }}>
                                {member.user.name || member.user.email}
                              </div>
                              <div style={{ fontSize: '11px', color: getRoleBadgeColor(member.role) }}>
                                {member.role}
                              </div>
                            </div>
                            <button
                              onClick={() => handleRemoveMember(workspace.id, member.id)}
                              style={{ 
                                background: 'none', 
                                border: 'none', 
                                color: '#64748b', 
                                cursor: 'pointer',
                                padding: '2px',
                                marginLeft: '4px'
                              }}
                              title="Remove member"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Groups Section */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <h4 style={{ margin: 0, fontSize: '14px', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <UsersRound size={16} />
                          Groups with Access ({assignedGroups.length})
                        </h4>
                        <button 
                          className="btn btn-sm"
                          onClick={() => setShowAssignGroup(showAssignGroup === workspace.id ? null : workspace.id)}
                        >
                          <Plus size={14} />
                          Assign Group
                        </button>
                      </div>

                      {/* Assign Group Form */}
                      {showAssignGroup === workspace.id && (
                        <div style={{ 
                          background: '#1e1e2e', 
                          padding: '16px', 
                          borderRadius: '8px', 
                          marginBottom: '16px',
                          border: '1px solid #3d3d5c'
                        }}>
                          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                            <select
                              value={selectedGroup}
                              onChange={(e) => setSelectedGroup(e.target.value)}
                              style={{ 
                                flex: 1, 
                                minWidth: '200px',
                                padding: '8px 12px', 
                                borderRadius: '6px', 
                                border: '1px solid #3d3d5c', 
                                background: '#2d2d44', 
                                color: '#e2e8f0' 
                              }}
                            >
                              <option value="">Select group...</option>
                              {groups
                                .filter(g => !g.workspaceAccess?.some(wa => wa.workspaceId === workspace.id))
                                .map(g => (
                                  <option key={g.id} value={g.id}>{g.name}</option>
                                ))}
                            </select>
                            <select
                              value={groupRole}
                              onChange={(e) => setGroupRole(e.target.value)}
                              style={{ 
                                padding: '8px 12px', 
                                borderRadius: '6px', 
                                border: '1px solid #3d3d5c', 
                                background: '#2d2d44', 
                                color: '#e2e8f0' 
                              }}
                            >
                              <option value="viewer">Viewer</option>
                              <option value="editor">Editor</option>
                            </select>
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => handleAssignGroup(workspace.id)}
                              disabled={assigningGroup}
                            >
                              {assigningGroup ? <Loader2 size={14} className="spinner" /> : 'Assign'}
                            </button>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => {
                                setShowAssignGroup(null);
                                setSelectedGroup('');
                                setGroupRole('viewer');
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Groups List */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {assignedGroups.length === 0 ? (
                          <span style={{ fontSize: '13px', color: '#64748b', fontStyle: 'italic' }}>
                            No groups assigned to this workspace
                          </span>
                        ) : (
                          assignedGroups.map(group => {
                            const access = group.workspaceAccess?.find(wa => wa.workspaceId === workspace.id);
                            return (
                              <div
                                key={group.id}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  padding: '8px 12px',
                                  background: '#1e1e2e',
                                  borderRadius: '8px',
                                  border: '1px solid #3d3d5c'
                                }}
                              >
                                <UsersRound size={16} color="#6366f1" />
                                <div>
                                  <div style={{ fontSize: '13px', color: '#e2e8f0' }}>{group.name}</div>
                                  <div style={{ fontSize: '11px', color: getRoleBadgeColor(access?.role || 'viewer') }}>
                                    {access?.role || 'viewer'}
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleRemoveGroupAccess(group.id, access!.id, group.name)}
                                  style={{ 
                                    background: 'none', 
                                    border: 'none', 
                                    color: '#64748b', 
                                    cursor: 'pointer',
                                    padding: '2px',
                                    marginLeft: '4px'
                                  }}
                                  title="Remove group access"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Add Workspace Modal */}
      {showAddModal && (
        <div 
          className="user-modal-overlay" 
          onClick={() => setShowAddModal(false)}
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
                <Building2 size={20} />
                Create New Workspace
              </h2>
              <button 
                className="close-btn" 
                onClick={() => setShowAddModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateWorkspace} className="user-form" style={{ padding: '20px', background: '#1e1e2e' }}>
              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '14px', fontWeight: 500, color: '#e2e8f0' }}>
                  <Building2 size={16} />
                  Workspace Name *
                </label>
                <input
                  type="text"
                  value={newWorkspace.name}
                  onChange={(e) => setNewWorkspace({ ...newWorkspace, name: e.target.value })}
                  placeholder="e.g., Engineering Team"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: '#2d2d44',
                    border: '1px solid #3d3d5c',
                    borderRadius: '6px',
                    color: '#e2e8f0',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '14px', fontWeight: 500, color: '#e2e8f0' }}>
                  Description
                </label>
                <textarea
                  value={newWorkspace.description}
                  onChange={(e) => setNewWorkspace({ ...newWorkspace, description: e.target.value })}
                  placeholder="Optional description..."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: '#2d2d44',
                    border: '1px solid #3d3d5c',
                    borderRadius: '6px',
                    color: '#e2e8f0',
                    fontSize: '14px',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div className="form-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #3d3d5c' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAddModal(false)}
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
                  type="submit"
                  className="btn btn-primary"
                  disabled={creatingWorkspace}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#6366f1',
                    color: 'white',
                    cursor: creatingWorkspace ? 'not-allowed' : 'pointer',
                    opacity: creatingWorkspace ? 0.6 : 1,
                    fontSize: '14px'
                  }}
                >
                  {creatingWorkspace ? (
                    <>
                      <Loader2 size={16} className="spinner" style={{ animation: 'spin 1s linear infinite' }} />
                      Creating...
                    </>
                  ) : (
                    'Create Workspace'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
