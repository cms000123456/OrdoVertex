import React, { useState, useEffect, useCallback } from 'react';
import { Users, Plus, X, Trash2, Edit2, Save, UserPlus, Loader2 } from 'lucide-react';
import { groupsApi, workspacesApi } from '../services/api';
import './GroupsTeamsManager.css';

interface User {
  id: string;
  email: string;
  name?: string;
}

interface GroupMember {
  id: string;
  userId: string;
  user: User;
  joinedAt: string;
}

interface WorkspaceAccess {
  id: string;
  workspaceId: string;
  workspace: { id: string; name: string };
  role: string;
}

interface Group {
  id: string;
  name: string;
  description?: string;
  workspaceId: string;
  members: GroupMember[];
  workspaceAccess?: WorkspaceAccess[];
  _count: { members: number };
  createdAt: string;
}

interface Workspace {
  id: string;
  name: string;
  members: { userId: string; user: User; role: string }[];
}

export function GroupsTeamsManager() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>('');
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Form states
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [selectedWorkspaces, setSelectedWorkspaces] = useState<string[]>([]);
  const [editingGroup, setEditingGroup] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editWorkspaces, setEditWorkspaces] = useState<string[]>([]);
  
  // Member management
  const [showAddMember, setShowAddMember] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<string>('');
  
  // Check if user is admin
  const [isAdmin, setIsAdmin] = useState(false);
  
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    setIsAdmin(user.role === 'admin');
  }, []);

  // Load all data on mount
  useEffect(() => {
    loadWorkspaces();
    loadAllGroups();
  }, []);

  const loadWorkspaces = async () => {
    try {
      const response = await workspacesApi.getAll();
      console.log('Workspaces response:', response.data);
      const workspacesData = response.data?.data || response.data || [];
      console.log('Parsed workspaces:', workspacesData);
      setWorkspaces(workspacesData);
      if (workspacesData.length > 0 && !selectedWorkspace) {
        console.log('Setting selected workspace:', workspacesData[0].id);
        setSelectedWorkspace(workspacesData[0].id);
      } else {
        console.log('No workspaces found or already selected');
        setLoading(false); // Stop loading if no workspaces
      }
      setError(null);
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message || 'Unknown error';
      setError('Failed to load workspaces: ' + errorMsg + '. Please ensure you are logged in and have workspace access.');
      console.error('Workspace load error:', err);
      setLoading(false);
    }
  };

  const loadAllGroups = async () => {
    setLoading(true);
    try {
      const response = await groupsApi.getAll();
      setGroups(response.data?.data || []);
      setError(null);
    } catch (err: any) {
      setError('Failed to load groups: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleAssignWorkspace = async (groupId: string, workspaceId: string) => {
    try {
      await groupsApi.addWorkspaceAccess(groupId, workspaceId, 'viewer');
      loadAllGroups();
    } catch (err: any) {
      setError('Failed to assign workspace: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleRemoveWorkspaceAccess = async (groupId: string, accessId: string) => {
    try {
      await groupsApi.removeWorkspaceAccess(groupId, accessId);
      loadAllGroups();
    } catch (err: any) {
      setError('Failed to remove workspace access: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    
    if (selectedWorkspaces.length === 0) {
      setError('Please select at least one workspace');
      return;
    }

    try {
      await groupsApi.create({
        name: newGroupName,
        description: newGroupDescription,
        workspaceIds: selectedWorkspaces
      });
      setNewGroupName('');
      setNewGroupDescription('');
      setSelectedWorkspaces([]);
      setShowCreateForm(false);
      loadAllGroups();
    } catch (err: any) {
      setError('Failed to create group: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleUpdateGroup = async (groupId: string) => {
    try {
      await groupsApi.update(groupId, {
        name: editName,
        description: editDescription
      });
      setEditingGroup(null);
      loadAllGroups();
    } catch (err: any) {
      setError('Failed to update group: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!window.confirm('Are you sure you want to delete this group?')) return;

    try {
      await groupsApi.delete(groupId);
      loadAllGroups();
    } catch (err: any) {
      setError('Failed to delete group: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleAddMember = async (groupId: string) => {
    if (!selectedUser) return;

    try {
      await groupsApi.addMember(groupId, selectedUser);
      setShowAddMember(null);
      setSelectedUser('');
      loadAllGroups();
    } catch (err: any) {
      setError('Failed to add member: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleRemoveMember = async (groupId: string, memberId: string) => {
    if (!window.confirm('Remove this member from the group?')) return;

    try {
      await groupsApi.removeMember(groupId, memberId);
      loadAllGroups();
    } catch (err: any) {
      setError('Failed to remove member: ' + (err.response?.data?.error || err.message));
    }
  };

  const currentWorkspace = workspaces.find(w => w.id === selectedWorkspace);
  const availableUsers = currentWorkspace?.members.filter(
    wm => !groups.find(g => g.id === showAddMember)?.members.some(m => m.userId === wm.userId)
  ) || [];

  return (
    <div className="groups-manager">
      <div className="groups-header">
        <h1><Users size={24} /> Groups & Teams</h1>
        <p className="subtitle">Manage user groups for workspace collaboration and shared workflows</p>
      </div>

      {error && (
        <div className="error-banner">
          {error}
          <button onClick={() => setError(null)}><X size={16} /></button>
        </div>
      )}

      <div className="groups-actions">
        <button 
          className="btn btn-primary"
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          <Plus size={16} />
          Create Group
        </button>
      </div>

      {showCreateForm && (
        <form className="create-group-form" onSubmit={handleCreateGroup}>
          <h3>Create New Group</h3>
          <div className="form-row">
            <input
              type="text"
              placeholder="Group name (e.g., Analytics Team)"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              required
            />
          </div>
          <div className="form-row">
            <input
              type="text"
              placeholder="Description (optional)"
              value={newGroupDescription}
              onChange={(e) => setNewGroupDescription(e.target.value)}
            />
          </div>
          {workspaces.length > 0 ? (
            <div className="form-row">
              <label className="form-label">
                Assign to Workspaces <span className="required">*</span>
              </label>
              <div className="workspace-checkboxes">
                {workspaces.map(ws => (
                  <label key={ws.id} className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={selectedWorkspaces.includes(ws.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedWorkspaces([...selectedWorkspaces, ws.id]);
                        } else {
                          setSelectedWorkspaces(selectedWorkspaces.filter(id => id !== ws.id));
                        }
                      }}
                    />
                    {ws.name}
                  </label>
                ))}
              </div>
              <p className="form-hint">Select at least one workspace for this group. Admins can assign multiple workspaces.</p>
            </div>
          ) : (
            <div className="form-row">
              <div className="error-text">No workspaces available. Create a workspace first.</div>
            </div>
          )}
          <div className="form-actions">
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={!newGroupName.trim() || selectedWorkspaces.length === 0}
            >
              Create
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setShowCreateForm(false)}>Cancel</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="loading-state"><Loader2 className="spin" /> Loading groups...</div>
      ) : groups.length === 0 ? (
        <div className="empty-state">
          <Users size={48} />
          <h3>No groups yet</h3>
          <p>Create a group to organize users and share workflows</p>
        </div>
      ) : (
        <div className="groups-list">
          {groups.map(group => (
            <div key={group.id} className="group-card">
              <div className="group-header">
                {editingGroup === group.id ? (
                  <div className="edit-form">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                    />
                    <input
                      type="text"
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      placeholder="Description"
                    />
                    <button 
                      className="btn-icon"
                      onClick={() => handleUpdateGroup(group.id)}
                      title="Save"
                    >
                      <Save size={16} />
                    </button>
                    <button 
                      className="btn-icon"
                      onClick={() => setEditingGroup(null)}
                      title="Cancel"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="group-info">
                      <h3>{group.name}</h3>
                      {group.description && <p className="description">{group.description}</p>}
                      <div className="group-meta">
                        <span className="member-count">{group._count?.members || 0} members</span>
                        {group.workspaceAccess && group.workspaceAccess.length > 0 && (
                          <span className="workspace-access">
                            Access to: {group.workspaceAccess.map(wa => wa.workspace.name).join(', ')}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="group-actions">
                      <button 
                        className="btn-icon"
                        onClick={() => {
                          setEditingGroup(group.id);
                          setEditName(group.name);
                          setEditDescription(group.description || '');
                        }}
                        title="Edit"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        className="btn-icon btn-danger"
                        onClick={() => handleDeleteGroup(group.id)}
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </>
                )}
              </div>

              <div className="group-members">
                <div className="members-header">
                  <h4>Members</h4>
                  <button 
                    className="btn btn-sm"
                    onClick={() => setShowAddMember(showAddMember === group.id ? null : group.id)}
                  >
                    <UserPlus size={14} />
                    Add Member
                  </button>
                </div>

                {showAddMember === group.id && (
                  <div className="add-member-form">
                    <select 
                      value={selectedUser} 
                      onChange={(e) => setSelectedUser(e.target.value)}
                    >
                      <option value="">Select user...</option>
                      {availableUsers.map(u => (
                        <option key={u.userId} value={u.userId}>
                          {u.user.name || u.user.email}
                        </option>
                      ))}
                    </select>
                    <button 
                      className="btn btn-primary btn-sm"
                      onClick={() => handleAddMember(group.id)}
                      disabled={!selectedUser}
                    >
                      Add
                    </button>
                    <button 
                      className="btn btn-secondary btn-sm"
                      onClick={() => setShowAddMember(null)}
                    >
                      Cancel
                    </button>
                  </div>
                )}

                <div className="members-list">
                  {group.members.length === 0 ? (
                    <p className="no-members">No members yet</p>
                  ) : (
                    group.members.map(member => (
                      <div key={member.id} className="member-item">
                        <div className="member-info">
                          <span className="member-name">{member.user.name || member.user.email}</span>
                          <span className="member-email">{member.user.email}</span>
                        </div>
                        <button 
                          className="btn-icon btn-danger btn-sm"
                          onClick={() => handleRemoveMember(group.id, member.id)}
                          title="Remove"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
