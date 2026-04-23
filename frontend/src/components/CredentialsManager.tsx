import React, { useState, useEffect, useCallback } from 'react';
import { Key, Plus, Trash2, Edit2, Eye, EyeOff, X, Database, Globe, Lock, Shield, Box, CheckCircle, Bot, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { Credential, CredentialTypeInfo, CredentialField } from '../types';
import { credentialApi } from '../services/api';

// Vault Test Button Component
function VaultTestButton({ formData }: { formData: Record<string, any> }) {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleTest = async () => {
    if (!formData.url || !formData.token) {
      setTestResult({ success: false, message: 'Please enter Vault URL and token first' });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      await credentialApi.testVault({
        url: formData.url,
        token: formData.token,
        namespace: formData.namespace
      });
      setTestResult({ success: true, message: 'Vault connection successful!' });
    } catch (err: any) {
      setTestResult({ 
        success: false, 
        message: err.response?.data?.error || 'Failed to connect to Vault'
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="vault-test-section">
      <button
        type="button"
        className="btn btn-secondary"
        onClick={handleTest}
        disabled={testing}
      >
        {testing ? 'Testing...' : 'Test Vault Connection'}
      </button>
      {testResult && (
        <div className={`test-result ${testResult.success ? 'success' : 'error'}`}>
          {testResult.success && <CheckCircle size={16} />}
          {testResult.message}
        </div>
      )}
    </div>
  );
}

interface CredentialsManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

const CREDENTIAL_ICONS: Record<string, React.ReactNode> = {
  database: <Database size={18} />,
  http: <Globe size={18} />,
  oauth2: <Lock size={18} />,
  apiKey: <Key size={18} />,
  ssh: <Shield size={18} />,
  generic: <Key size={18} />,
  hashicorpVault: <Box size={18} />,
  openai: <Sparkles size={18} />,
  anthropic: <Bot size={18} />,
};

const CREDENTIAL_LABELS: Record<string, string> = {
  database: 'Database',
  http: 'HTTP Basic Auth',
  oauth2: 'OAuth 2.0',
  apiKey: 'API Key',
  ssh: 'SSH',
  generic: 'Generic',
  hashicorpVault: 'HashiCorp Vault',
  openai: 'OpenAI API',
  anthropic: 'Anthropic Claude',
};

export function CredentialsManager({ isOpen, onClose }: CredentialsManagerProps) {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [credentialTypes, setCredentialTypes] = useState<Record<string, CredentialTypeInfo>>({
    database: { name: 'Database', description: 'Database connection credentials', fields: [] },
    http: { name: 'HTTP Basic Auth', description: 'HTTP Basic Authentication', fields: [] },
    apiKey: { name: 'API Key', description: 'API Key authentication', fields: [] },
    oauth2: { name: 'OAuth 2.0', description: 'OAuth 2.0 credentials', fields: [] },
    ssh: { name: 'SSH', description: 'SSH credentials', fields: [] },
    generic: { name: 'Generic', description: 'Generic key-value credentials', fields: [] },
    hashicorpVault: { name: 'HashiCorp Vault', description: 'Fetch secrets from HashiCorp Vault', fields: [] },
    openai: { name: 'OpenAI API', description: 'OpenAI API key for GPT models', fields: [] },
    anthropic: { name: 'Anthropic Claude', description: 'Anthropic API key for Claude models', fields: [] }
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingCredential, setEditingCredential] = useState<Credential | null>(null);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  // Form state
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState('database');
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [hasLoadedTypes, setHasLoadedTypes] = useState(false);

  const fetchCredentials = useCallback(async () => {
    try {
      setLoading(true);
      const response = await credentialApi.list();
      // Handle both response formats
      const creds = response.data.credentials || response.data.data?.credentials || [];
      setCredentials(creds);
      setError(null);
    } catch (err: any) {
      console.error('Failed to load credentials:', err);
      setError(err.message || 'Failed to load credentials');
      setCredentials([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCredentialTypes = useCallback(async () => {
    try {
      const response = await credentialApi.getTypes();
      if (response.data?.types) {
        setCredentialTypes(response.data.types);
        setHasLoadedTypes(true);
      } else if (response.data?.data?.types) {
        setCredentialTypes(response.data.data.types);
        setHasLoadedTypes(true);
      }
    } catch (err: any) {
      console.error('Failed to load credential types:', err);
      setError('Failed to load credential types. Please try again.');
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchCredentials();
      fetchCredentialTypes();
    }
  }, [isOpen, fetchCredentials, fetchCredentialTypes]);

  const resetForm = () => {
    setFormName('');
    setFormType('database');
    setFormData({});
    setEditingCredential(null);
    setShowPasswords({});
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formName.trim()) {
      setError('Name is required');
      return;
    }
    if (!formType) {
      setError('Type is required');
      return;
    }
    
    // Check required fields
    const requiredFields = credentialTypes?.[formType]?.fields?.filter((f: any) => f.required) || [];
    const missingFields = requiredFields.filter((f: any) => !formData[f.name] || formData[f.name].toString().trim() === '');
    if (missingFields.length > 0) {
      setError(`Please fill in required fields: ${missingFields.map((f: any) => f.displayName).join(', ')}`);
      return;
    }
    
    try {
      setError(null);
      setSaving(true);
      const createResponse = await credentialApi.create({
        name: formName.trim(),
        type: formType,
        data: formData,
      });
      resetForm();
      setShowCreateForm(false);
      // Small delay to ensure DB commit before fetching
      setTimeout(() => {
        fetchCredentials();
      }, 100);
      toast.success('Credential created successfully');
    } catch (err: any) {
      console.error('Credential creation error:', err);
      const errorMsg = err.response?.data?.error || err.message || 'Failed to create credential';
      setError(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCredential) return;

    try {
      setSaving(true);
      await credentialApi.update(editingCredential.id, {
        name: formName,
        data: formData,
      });
      resetForm();
      setShowCreateForm(false);
      fetchCredentials();
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message || 'Failed to update credential';
      setError(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this credential?')) return;

    try {
      await credentialApi.delete(id);
      fetchCredentials();
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message || 'Failed to delete credential';
      setError(errorMsg);
    }
  };

  const startEdit = (credential: Credential) => {
    setEditingCredential(credential);
    setFormName(credential.name);
    setFormType(credential.type);
    setFormData(credential.data || {});
    setShowCreateForm(true);
  };

  const togglePasswordVisibility = (fieldName: string) => {
    setShowPasswords(prev => ({
      ...prev,
      [fieldName]: !prev[fieldName]
    }));
  };

  const renderFieldInput = (field: CredentialField) => {
    const value = formData[field.name] ?? field.default ?? '';
    const isPassword = field.sensitive;
    const showPassword = showPasswords[field.name];

    if (field.multiline) {
      return (
        <textarea
          value={value}
          onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
          className="form-textarea"
          rows={4}
          required={field.required}
        />
      );
    }

    if (field.type === 'boolean') {
      return (
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={value || false}
            onChange={(e) => setFormData({ ...formData, [field.name]: e.target.checked })}
          />
          <span className="checkbox-text">{field.displayName}</span>
        </label>
      );
    }

    if (field.type === 'number') {
      return (
        <input
          type="number"
          value={value}
          onChange={(e) => setFormData({ ...formData, [field.name]: parseInt(e.target.value) || '' })}
          className="form-input"
          required={field.required}
        />
      );
    }

    return (
      <div className="password-field">
        <input
          type={isPassword && !showPassword ? 'password' : 'text'}
          value={value}
          onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
          className="form-input"
          required={field.required}
          placeholder={isPassword ? '••••••••' : ''}
        />
        {isPassword && (
          <button
            type="button"
            className="toggle-password-btn"
            onClick={() => togglePasswordVisibility(field.name)}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content credentials-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            <Key size={20} />
            Credentials Management
          </h2>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {error && (
            <div className="error-message">
              {error}
              <button onClick={() => setError(null)}>×</button>
            </div>
          )}

          {!showCreateForm ? (
            <>
              <div className="credentials-toolbar">
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    resetForm();
                    setShowCreateForm(true);
                  }}
                >
                  <Plus size={16} />
                  New Credential
                </button>
              </div>

              {loading ? (
                <div className="loading-state">Loading credentials...</div>
              ) : !credentials || credentials.length === 0 ? (
                <div className="empty-state">
                  <Key size={48} />
                  <p>No credentials yet</p>
                  <p className="empty-subtitle">Create a credential to securely store connection details</p>
                </div>
              ) : (
                <div className="credentials-list">
                  {credentials.map((credential) => (
                    <div key={credential.id} className="credential-card">
                      <div className="credential-icon">
                        {CREDENTIAL_ICONS[credential.type] || <Key size={18} />}
                      </div>
                      <div className="credential-info">
                        <h4>{credential.name}</h4>
                        <span className="credential-type">
                          {CREDENTIAL_LABELS[credential.type] || credential.type}
                        </span>
                        {credential.lastUsed && (
                          <span className="credential-last-used">
                            Last used: {new Date(credential.lastUsed).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <div className="credential-actions">
                        <button
                          className="btn btn-icon"
                          onClick={() => startEdit(credential)}
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          className="btn btn-icon btn-danger"
                          onClick={() => handleDelete(credential.id)}
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <form onSubmit={editingCredential ? handleUpdate : handleCreate} className="credential-form">
              <h3>{editingCredential ? 'Edit Credential' : 'New Credential'}</h3>

              <div className="form-group">
                <label>Name *</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="form-input"
                  placeholder="e.g., Production Database"
                  required
                />
              </div>

              {!editingCredential && (
                <div className="form-group">
                  <label>Type *</label>
                  <select
                    value={formType}
                    onChange={(e) => {
                      setFormType(e.target.value);
                      setFormData({});
                    }}
                    className="form-select"
                    required
                  >
                    {Object.entries(credentialTypes || {}).map(([key, info]) => (
                      <option key={key} value={key}>
                        {info.name}
                      </option>
                    ))}
                  </select>
                  <p className="form-help">
                    {credentialTypes?.[formType]?.description}
                  </p>
                </div>
              )}

              <div className="credential-fields">
                <h4>Configuration</h4>
                {!hasLoadedTypes ? (
                  <div className="loading-fields">Loading credential fields...</div>
                ) : (
                  <>
                    {credentialTypes?.[formType]?.fields?.map((field) => (
                      <div key={field.name} className="form-group">
                        <label>
                          {field.displayName}
                          {field.required && <span className="required">*</span>}
                        </label>
                        {renderFieldInput(field)}
                      </div>
                    ))}
                    
                    {formType === 'hashicorpVault' && (
                      <VaultTestButton formData={formData} />
                    )}
                  </>
                )}
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    resetForm();
                    setShowCreateForm(false);
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : (editingCredential ? 'Update Credential' : 'Create Credential')}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      <style>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background: var(--bg-primary, #1e1e2e);
          border-radius: 12px;
          width: 90%;
          max-width: 600px;
          max-height: 90vh;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        }

        .credentials-modal {
          background-color: #1e1e2e !important;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid var(--border-color);
        }

        .modal-header h2 {
          display: flex;
          align-items: center;
          gap: 10px;
          margin: 0;
          font-size: 18px;
        }

        .modal-body {
          padding: 20px;
          overflow-y: auto;
          max-height: calc(90vh - 70px);
          color: #e2e8f0;
        }

        .credentials-toolbar {
          margin-bottom: 20px;
        }

        .btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          border-radius: 6px;
          border: none;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s;
        }

        .btn-primary {
          background: var(--accent-primary);
          color: white;
        }

        .btn-primary:hover {
          background: var(--accent-primary-hover);
        }

        .btn-secondary {
          background: var(--bg-secondary);
          color: var(--text-primary);
        }

        .btn-secondary:hover {
          background: var(--bg-tertiary);
        }

        .btn-danger {
          color: var(--error-color);
        }

        .btn-danger:hover {
          background: var(--error-bg);
        }

        .btn-icon {
          padding: 8px;
          background: transparent;
        }

        .credentials-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .credential-card {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px;
          background: var(--bg-secondary);
          border-radius: 8px;
          border: 1px solid var(--border-color);
        }

        .credential-icon {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--accent-primary);
          color: white;
          border-radius: 8px;
        }

        .credential-info {
          flex: 1;
        }

        .credential-info h4 {
          margin: 0 0 4px 0;
          font-size: 15px;
        }

        .credential-type {
          display: inline-block;
          padding: 2px 8px;
          background: var(--bg-tertiary, #2d2d44);
          border-radius: 4px;
          font-size: 12px;
          color: #cbd5e1;
          margin-right: 8px;
        }

        .credential-last-used {
          font-size: 12px;
          color: #94a3b8;
        }

        .credential-actions {
          display: flex;
          gap: 8px;
        }

        .empty-state {
          text-align: center;
          padding: 60px 20px;
          color: #94a3b8;
        }

        .empty-state p {
          margin: 8px 0;
        }

        .empty-subtitle {
          font-size: 14px;
        }

        .credential-form {
          max-width: 100%;
        }

        .credential-form h3 {
          margin: 0 0 20px 0;
          font-size: 16px;
        }

        .credential-fields {
          margin-top: 24px;
          padding-top: 24px;
          border-top: 1px solid var(--border-color);
        }

        .credential-fields h4 {
          margin: 0 0 16px 0;
          font-size: 14px;
          color: var(--text-secondary);
        }

        .form-group {
          margin-bottom: 16px;
        }

        .form-group label {
          display: block;
          margin-bottom: 6px;
          font-size: 13px;
          font-weight: 500;
        }

        .form-group .required {
          color: var(--error-color);
          margin-left: 4px;
        }

        .form-input,
        .form-select,
        .form-textarea {
          width: 100%;
          padding: 8px 12px;
          background: #2d2d44;
          border: 1px solid #3d3d5c;
          border-radius: 6px;
          color: #e2e8f0;
          font-size: 14px;
        }

        .form-input:focus,
        .form-select:focus,
        .form-textarea:focus {
          outline: none;
          border-color: #6366f1;
        }

        .form-select option {
          background: #2d2d44;
          color: #e2e8f0;
        }

        .form-textarea {
          resize: vertical;
          min-height: 80px;
          font-family: monospace;
        }

        .form-help {
          margin: 6px 0 0 0;
          font-size: 12px;
          color: #94a3b8;
        }

        .password-field {
          position: relative;
        }

        .password-field .form-input {
          padding-right: 40px;
        }

        .toggle-password-btn {
          position: absolute;
          right: 8px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 4px;
        }

        .toggle-password-btn:hover {
          color: var(--text-primary);
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
        }

        .checkbox-text {
          font-size: 14px;
          color: #cbd5e1;
        }

        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 24px;
          padding-top: 20px;
          border-top: 1px solid var(--border-color);
        }

        .error-message {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background: var(--error-bg);
          color: var(--error-color);
          border-radius: 6px;
          margin-bottom: 16px;
        }

        .error-message button {
          background: none;
          border: none;
          color: inherit;
          font-size: 18px;
          cursor: pointer;
        }

        .loading-state {
          text-align: center;
          padding: 40px;
          color: #94a3b8;
        }

        .close-btn {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
        }

        .close-btn:hover {
          background: var(--bg-secondary);
          color: var(--text-primary);
        }

        .vault-test-section {
          margin-top: 16px;
          padding: 16px;
          background: rgba(99, 102, 241, 0.1);
          border-radius: 8px;
          border: 1px solid rgba(99, 102, 241, 0.3);
        }

        .vault-test-section .btn {
          font-size: 13px;
          padding: 6px 12px;
        }

        .test-result {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 12px;
          padding: 10px 12px;
          border-radius: 6px;
          font-size: 13px;
        }

        .test-result.success {
          background: rgba(34, 197, 94, 0.15);
          color: #4ade80;
          border: 1px solid rgba(34, 197, 94, 0.3);
        }

        .test-result.error {
          background: rgba(239, 68, 68, 0.15);
          color: #f87171;
          border: 1px solid rgba(239, 68, 68, 0.3);
        }
      `}</style>
    </div>
  );
}
