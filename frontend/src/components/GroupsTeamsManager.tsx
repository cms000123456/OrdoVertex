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

interface Group {
  id: string;
  name: string;
  description?: string;
  workspaceId: string;
  members: GroupMember[];
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
  const [editingGroup, setEditingGroup] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  
  // Member management
  const [showAddMember, setShowAddMember] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<string>('');

  // Load workspaces on mount
  useEffect(() => {
    loadWorkspaces();
  }, []);

  // Load groups when workspace changes
  useEffect(() => {
    if (selectedWorkspace) {
      loadGroups(selectedWorkspace);
    }
  }, [selectedWorkspace]);

  const loadWorkspaces = async () => {
    try {
      const response = await workspacesApi.getAll();
      const workspacesData = response.data?.data || response.data || [];
      setWorkspaces(workspacesData);
      if (workspacesData.length > 0 && !selectedWorkspace) {
        setSelectedWorkspace(workspacesData[0].id);
      }
    } catch (err: any) {
      setError('Failed to load workspaces: ' + (err.message || 'Unknown error'));
    }
  };

  const loadGroups = async (workspaceId: string) => {
    setLoading(true);
    try {
      const response = await groupsApi.getByWorkspace(workspaceId);
      setGroups(response.data?.data || []);
      setError(null);
    } catch (err: any) {
      setError('Failed to load groups: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim() || !selectedWorkspace) return;

    try {
      await groupsApi.create({
        name: newGroupName,
        description: newGroupDescription,
        workspaceId: selectedWorkspace
      });
      setNewGroupName('');
      setNewGroupDescription('');
      setShowCreateForm(false);
      loadGroups(selectedWorkspace);
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
      loadGroups(selectedWorkspace);
    } catch (err: any) {
      setError('Failed to update group: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm('Are you sure you want to delete this group?')) return;

    try {
      await groupsApi.delete(groupId);
      loadGroups(selectedWorkspace);
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
      loadGroups(selectedWorkspace);
    } catch (err: any) {
      setError('Failed to add member: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleRemoveMember = async (groupId: string, memberId: string) => {
    if (!confirm('Remove this member from the group?')) return;

    try {
      await groupsApi.removeMember(groupId, memberId);
      loadGroups(selectedWorkspace);
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

      <div className="workspace-selector">
        <label>Select Workspace:</label>
        <select 
          value={selectedWorkspace} 
          onChange={(e) => setSelectedWorkspace(e.target.value)}
        >
          {workspaces.map(w => (
            <option key={w.id} value={w.id}>{w.name}</option>
          ))}
        </select>
      </div>

      <div className="groups-actions">
        <button 
          className="btn btn-primary"
          onClick={() => setShowCreateForm(!showCreateForm)}
          disabled={!selectedWorkspace}
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
              placeholder="Group name"
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
          <div className="form-actions">
            <button type="submit" className="btn btn-primary">Create</button>
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
                      <span className="member-count">{group._count?.members || 0} members</span>
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
