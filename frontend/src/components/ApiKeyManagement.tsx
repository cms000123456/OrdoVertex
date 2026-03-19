import React, { useState, useEffect } from 'react';
import { Key, Plus, Trash2, Copy, AlertCircle, Loader2, X, Calendar, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import './ApiKeyManagement.css';

interface ApiKey {
  id: string;
  name: string;
  key: string;
  createdAt: string;
  lastUsed: string | null;
  user: {
    id: string;
    email: string;
    name: string | null;
  };
}

export function ApiKeyManagement() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [creatingKey, setCreatingKey] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadApiKeys();
  }, []);

  const loadApiKeys = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/api-keys');
      setApiKeys(response.data.data.apiKeys || []);
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to load API keys');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newKeyName.trim()) {
      toast.error('Key name is required');
      return;
    }

    setCreatingKey(true);
    try {
      const response = await api.post('/api-keys', { name: newKeyName.trim() });
      const newKey = response.data.data.apiKey;
      setApiKeys([newKey, ...apiKeys]);
      setNewlyCreatedKey(newKey.key);
      setNewKeyName('');
      toast.success('API key created successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to create API key');
    } finally {
      setCreatingKey(false);
    }
  };

  const handleDeleteKey = async (keyId: string) => {
    if (!window.confirm('Are you sure you want to delete this API key? This action cannot be undone.')) {
      return;
    }

    try {
      await api.delete(`/api-keys/${keyId}`);
      setApiKeys(apiKeys.filter(k => k.id !== keyId));
      toast.success('API key deleted successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to delete API key');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const toggleKeyVisibility = (keyId: string) => {
    const newVisible = new Set(visibleKeys);
    if (newVisible.has(keyId)) {
      newVisible.delete(keyId);
    } else {
      newVisible.add(keyId);
    }
    setVisibleKeys(newVisible);
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

  const maskKey = (key: string) => {
    if (key.length <= 8) return '****';
    return key.substring(0, 4) + '...' + key.substring(key.length - 4);
  };

  if (isLoading) {
    return (
      <div className="api-key-management">
        <div className="loading-container">
          <Loader2 size={32} className="spinner" />
          <p>Loading API keys...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="api-key-management">
      <div className="page-header">
        <div className="header-title">
          <Key size={28} />
          <h1>API Key Management</h1>
        </div>
        <div className="header-actions">
          <button
            className="btn btn-primary"
            onClick={() => {
              setNewlyCreatedKey(null);
              setShowAddModal(true);
            }}
          >
            <Plus size={18} />
            Create API Key
          </button>
        </div>
      </div>

      <div className="info-card">
        <AlertCircle size={18} />
        <p>
          API keys allow external applications to authenticate with OrdoVertex. 
          Keep your keys secure and never share them publicly.
        </p>
      </div>

      <div className="api-keys-table-container">
        <table className="api-keys-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>API Key</th>
              <th>Owner</th>
              <th>Created</th>
              <th>Last Used</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {apiKeys.length === 0 ? (
              <tr>
                <td colSpan={6} className="empty-state">
                  <Key size={24} />
                  <p>No API keys found</p>
                  <p className="empty-subtitle">Create an API key to get started</p>
                </td>
              </tr>
            ) : (
              apiKeys.map((apiKey) => (
                <tr key={apiKey.id}>
                  <td className="key-name">{apiKey.name}</td>
                  <td className="key-value">
                    <code>
                      {visibleKeys.has(apiKey.id) ? apiKey.key : maskKey(apiKey.key)}
                    </code>
                    <button
                      className="btn-icon"
                      onClick={() => toggleKeyVisibility(apiKey.id)}
                      title={visibleKeys.has(apiKey.id) ? 'Hide key' : 'Show key'}
                    >
                      {visibleKeys.has(apiKey.id) ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                    <button
                      className="btn-icon"
                      onClick={() => copyToClipboard(apiKey.key)}
                      title="Copy to clipboard"
                    >
                      <Copy size={16} />
                    </button>
                  </td>
                  <td className="key-owner">
                    {apiKey.user.name || apiKey.user.email}
                  </td>
                  <td className="date-cell">
                    {formatDate(apiKey.createdAt)}
                  </td>
                  <td className="date-cell">
                    {apiKey.lastUsed ? formatDate(apiKey.lastUsed) : 'Never'}
                  </td>
                  <td>
                    <button
                      className="btn-icon danger"
                      onClick={() => handleDeleteKey(apiKey.id)}
                      title="Delete API key"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create API Key Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                <Plus size={20} />
                Create API Key
              </h2>
              <button className="close-btn" onClick={() => setShowAddModal(false)}>
                <X size={20} />
              </button>
            </div>

            {newlyCreatedKey ? (
              <div className="key-created">
                <div className="success-message">
                  <AlertCircle size={24} />
                  <p>Your API key has been created. Copy it now - you won't see it again!</p>
                </div>
                <div className="key-display">
                  <code>{newlyCreatedKey}</code>
                  <button
                    className="btn btn-primary"
                    onClick={() => copyToClipboard(newlyCreatedKey)}
                  >
                    <Copy size={16} />
                    Copy Key
                  </button>
                </div>
                <div className="form-actions">
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowAddModal(false);
                      setNewlyCreatedKey(null);
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateKey} className="key-form">
                <div className="form-group">
                  <label>Key Name *</label>
                  <input
                    type="text"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="e.g., Production Integration"
                    required
                  />
                </div>

                <div className="form-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowAddModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={creatingKey}
                  >
                    {creatingKey ? (
                      <>
                        <Loader2 size={16} className="spinner" />
                        Creating...
                      </>
                    ) : (
                      'Create Key'
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
