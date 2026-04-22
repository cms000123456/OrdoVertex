import React, { useEffect, useState } from 'react';
import { Users, Shield, User, Trash2, Search, Loader2, AlertCircle, Plus, X, Mail, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import { usersApi } from '../services/api';
import { useAuthStore } from '../store/authStore';
import './UserManagement.css';

interface User {
  id: string;
  email: string;
  name: string | null;
  role: 'user' | 'admin';
  createdAt: string;
  updatedAt: string;
  _count?: {
    workflows: number;
  };
}

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingUser, setUpdatingUser] = useState<string | null>(null);
  const [deletingUser, setDeletingUser] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const currentUserId = useAuthStore((state) => state.user?.id);

  // Form state for adding user
  const [newUser, setNewUser] = useState({
    email: '',
    name: '',
    password: '',
    role: 'user' as 'user' | 'admin'
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const response = await usersApi.getAll();
      setUsers(response.data.data.users);
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: 'user' | 'admin') => {
    setUpdatingUser(userId);
    try {
      await usersApi.update(userId, { role: newRole });
      toast.success(`User role updated to ${newRole}`);
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to update role');
    } finally {
      setUpdatingUser(null);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    setDeletingUser(userId);
    try {
      await usersApi.delete(userId);
      toast.success('User deleted successfully');
      setUsers(users.filter(u => u.id !== userId));
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to delete user');
    } finally {
      setDeletingUser(null);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newUser.email || !newUser.password) {
      toast.error('Email and password are required');
      return;
    }

    if (newUser.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setCreatingUser(true);
    try {
      const response = await usersApi.create({
        email: newUser.email,
        password: newUser.password,
        name: newUser.name || undefined,
        role: newUser.role
      });
      toast.success('User created successfully');
      const newUserWithCount = {
        ...response.data.data.user,
        _count: { workflows: 0 }
      };
      setUsers([newUserWithCount, ...users]);
      setShowAddModal(false);
      setNewUser({ email: '', name: '', password: '', role: 'user' });
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to create user');
    } finally {
      setCreatingUser(false);
    }
  };

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="user-management">
        <div className="loading-container">
          <Loader2 size={32} className="spinner" />
          <p>Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="user-management">
      <div className="page-header">
        <div className="header-title">
          <Users size={28} />
          <h1>User Management</h1>
        </div>
        <div className="header-actions">
          <button
            className="btn btn-primary"
            onClick={() => setShowAddModal(true)}
          >
            <Plus size={18} />
            Add User
          </button>
        </div>
      </div>

      <div className="header-stats">
        <div className="stat-card">
          <span className="stat-value">{users.length}</span>
          <span className="stat-label">Total Users</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{users.filter(u => u.role === 'admin').length}</span>
          <span className="stat-label">Admins</span>
        </div>
      </div>

      <div className="search-bar">
        <Search size={18} />
        <input
          type="text"
          placeholder="Search users by email or name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="users-table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Workflows</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={5} className="empty-state">
                  <AlertCircle size={24} />
                  <p>{searchTerm ? 'No users found matching your search' : 'No users found'}</p>
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user.id}>
                  <td className="user-cell">
                    <div className="user-avatar">
                      {user.name?.[0] || user.email[0].toUpperCase()}
                    </div>
                    <div className="user-info">
                      <span className="user-name">{user.name || 'Unnamed User'}</span>
                      <span className="user-email">{user.email}</span>
                    </div>
                  </td>
                  <td>
                    <div className="role-badge-wrapper">
                      {user.role === 'admin' ? (
                        <span className="role-badge admin">
                          <Shield size={14} />
                          Admin
                        </span>
                      ) : (
                        <span className="role-badge user">
                          <User size={14} />
                          User
                        </span>
                      )}
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value as 'user' | 'admin')}
                        disabled={updatingUser === user.id || user.id === currentUserId}
                        className="role-select"
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                      {updatingUser === user.id && (
                        <Loader2 size={14} className="spinner-small" />
                      )}
                    </div>
                  </td>
                  <td className="workflows-count">
                    {user._count?.workflows ?? 0}
                  </td>
                  <td className="date-cell">
                    {formatDate(user.createdAt)}
                  </td>
                  <td>
                    <button
                      className="btn-icon danger"
                      onClick={() => handleDelete(user.id)}
                      disabled={deletingUser === user.id || user.id === currentUserId}
                      title={user.id === currentUserId ? 'Cannot delete yourself' : 'Delete user'}
                    >
                      {deletingUser === user.id ? (
                        <Loader2 size={16} className="spinner" />
                      ) : (
                        <Trash2 size={16} />
                      )}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add User Modal */}
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
                <Plus size={20} />
                Add New User
              </h2>
              <button 
                className="close-btn" 
                onClick={() => setShowAddModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="user-form" style={{ padding: '20px', background: '#1e1e2e' }}>
              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '14px', fontWeight: 500, color: '#e2e8f0' }}>
                  <Mail size={16} />
                  Email *
                </label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="user@example.com"
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
                  <User size={16} />
                  Name
                </label>
                <input
                  type="text"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  placeholder="John Doe"
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
                  <Lock size={16} />
                  Password *
                </label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  placeholder="Min 6 characters"
                  required
                  minLength={6}
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
                  <Shield size={16} />
                  Role
                </label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value as 'user' | 'admin' })}
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
                  <option value="user" style={{ background: '#2d2d44', color: '#e2e8f0' }}>User</option>
                  <option value="admin" style={{ background: '#2d2d44', color: '#e2e8f0' }}>Admin</option>
                </select>
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
                  disabled={creatingUser}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#6366f1',
                    color: 'white',
                    cursor: creatingUser ? 'not-allowed' : 'pointer',
                    opacity: creatingUser ? 0.6 : 1,
                    fontSize: '14px'
                  }}
                >
                  {creatingUser ? (
                    <>
                      <Loader2 size={16} className="spinner" style={{ animation: 'spin 1s linear infinite' }} />
                      Creating...
                    </>
                  ) : (
                    'Create User'
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
