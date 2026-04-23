import React, { useState, useEffect } from 'react';
import { Shield, Plus, Trash2, Edit2, X, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { samlApi } from '../services/api';
import './SAMLConfig.css';
import { getErrorMessage, getAxiosErrorData } from '../utils/error-helper';

interface SAMLProvider {
  id: string;
  provider: string;
  entityId: string;
  entryPoint: string;
  callbackUrl: string;
  logoutUrl?: string;
  isActive: boolean;
  createdAt: string;
}

export function SAMLConfig() {
  const [providers, setProviders] = useState<SAMLProvider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    provider: '',
    entityId: '',
    entryPoint: '',
    cert: '',
    privateKey: '',
    callbackUrl: '',
    logoutUrl: '',
    nameIdFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
    wantAssertionsSigned: true,
    wantResponseSigned: true,
    isActive: true
  });

  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = async () => {
    try {
      const response = await samlApi.getConfig();
      setProviders(response.data.data || []);
    } catch (error) {
      toast.error('Failed to load SAML configurations');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingId) {
        await samlApi.updateConfig(editingId, formData);
        toast.success('SAML configuration updated');
      } else {
        await samlApi.createConfig(formData);
        toast.success('SAML configuration created');
      }
      
      setShowForm(false);
      setEditingId(null);
      resetForm();
      loadProviders();
    } catch (error: unknown) {
      toast.error((getAxiosErrorData(error)?.message || getErrorMessage(error)) || 'Failed to save configuration');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this SAML configuration?')) return;
    
    try {
      await samlApi.deleteConfig(id);
      toast.success('SAML configuration deleted');
      loadProviders();
    } catch (error) {
      toast.error('Failed to delete configuration');
    }
  };

  const handleEdit = (provider: SAMLProvider) => {
    setEditingId(provider.id);
    setFormData({
      ...formData,
      provider: provider.provider,
      entityId: provider.entityId,
      entryPoint: provider.entryPoint,
      callbackUrl: provider.callbackUrl,
      logoutUrl: provider.logoutUrl || '',
      isActive: provider.isActive
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      provider: '',
      entityId: '',
      entryPoint: '',
      cert: '',
      privateKey: '',
      callbackUrl: '',
      logoutUrl: '',
      nameIdFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
      wantAssertionsSigned: true,
      wantResponseSigned: true,
      isActive: true
    });
  };

  if (isLoading) {
    return <div className="saml-config loading">Loading...</div>;
  }

  return (
    <div className="saml-config">
      <div className="page-header">
        <div className="header-title">
          <Shield size={28} />
          <div>
            <h1>SAML SSO Configuration</h1>
            <p>Configure Single Sign-On with SAML 2.0 identity providers</p>
          </div>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => {
            setEditingId(null);
            resetForm();
            setShowForm(true);
          }}
        >
          <Plus size={18} />
          Add Provider
        </button>
      </div>

      <div className="saml-info">
        <AlertCircle size={20} />
        <p>
          SAML SSO allows users to authenticate through your corporate identity provider 
          (Okta, Azure AD, OneLogin, etc.). Configure your IdP with the settings below.
        </p>
      </div>

      {providers.length === 0 ? (
        <div className="empty-state">
          <Shield size={48} />
          <h2>No SAML providers configured</h2>
          <p>Add your first SAML identity provider to enable SSO</p>
          <button
            className="btn btn-primary"
            onClick={() => setShowForm(true)}
          >
            <Plus size={18} />
            Add Provider
          </button>
        </div>
      ) : (
        <div className="providers-list">
          {providers.map((provider) => (
            <div key={provider.id} className="provider-card">
              <div className="provider-header">
                <div className="provider-info">
                  <h3>{provider.provider}</h3>
                  <span className={`status-badge ${provider.isActive ? 'active' : 'inactive'}`}>
                    {provider.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="provider-actions">
                  <button
                    className="action-btn"
                    onClick={() => handleEdit(provider)}
                    title="Edit"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    className="action-btn danger"
                    onClick={() => handleDelete(provider.id)}
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              
              <div className="provider-details">
                <div className="detail-row">
                  <label>Entity ID (SP):</label>
                  <code>{provider.entityId}</code>
                </div>
                <div className="detail-row">
                  <label>SSO URL (IdP):</label>
                  <code>{provider.entryPoint}</code>
                </div>
                <div className="detail-row">
                  <label>ACS URL:</label>
                  <code>{provider.callbackUrl}</code>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingId ? 'Edit SAML Provider' : 'Add SAML Provider'}</h2>
              <button className="close-btn" onClick={() => setShowForm(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-section">
                <h3>Basic Information</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>Provider Name *</label>
                    <input
                      type="text"
                      value={formData.provider}
                      onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                      placeholder="e.g., Okta, Azure AD, OneLogin"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Entity ID (SP) *</label>
                    <input
                      type="text"
                      value={formData.entityId}
                      onChange={(e) => setFormData({ ...formData, entityId: e.target.value })}
                      placeholder="https://your-app/saml/metadata"
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>SSO URL (IdP) *</label>
                    <input
                      type="url"
                      value={formData.entryPoint}
                      onChange={(e) => setFormData({ ...formData, entryPoint: e.target.value })}
                      placeholder="https://idp.example.com/sso/saml"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>ACS URL (Callback) *</label>
                    <input
                      type="url"
                      value={formData.callbackUrl}
                      onChange={(e) => setFormData({ ...formData, callbackUrl: e.target.value })}
                      placeholder="https://your-app/api/auth/saml/callback"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3>Certificates & Security</h3>
                <div className="form-group">
                  <label>IdP Certificate (X.509) *</label>
                  <textarea
                    value={formData.cert}
                    onChange={(e) => setFormData({ ...formData, cert: e.target.value })}
                    placeholder="-----BEGIN CERTIFICATE-----&#10;MIIDXTCCAkWg...&#10;-----END CERTIFICATE-----"
                    rows={4}
                    required={!editingId}
                  />
                </div>

                <div className="form-group">
                  <label>SP Private Key (Optional)</label>
                  <textarea
                    value={formData.privateKey}
                    onChange={(e) => setFormData({ ...formData, privateKey: e.target.value })}
                    placeholder="-----BEGIN PRIVATE KEY-----&#10;MIIEvQIBADAN...&#10;-----END PRIVATE KEY-----"
                    rows={4}
                  />
                  <small>Required if you want to sign SAML requests</small>
                </div>
              </div>

              <div className="form-section">
                <h3>Advanced Settings</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>Logout URL (Optional)</label>
                    <input
                      type="url"
                      value={formData.logoutUrl}
                      onChange={(e) => setFormData({ ...formData, logoutUrl: e.target.value })}
                      placeholder="https://idp.example.com/logout"
                    />
                  </div>
                  <div className="form-group">
                    <label>Name ID Format</label>
                    <select
                      value={formData.nameIdFormat}
                      onChange={(e) => setFormData({ ...formData, nameIdFormat: e.target.value })}
                    >
                      <option value="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress">Email Address</option>
                      <option value="urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified">Unspecified</option>
                      <option value="urn:oasis:names:tc:SAML:2.0:nameid-format:persistent">Persistent</option>
                      <option value="urn:oasis:names:tc:SAML:2.0:nameid-format:transient">Transient</option>
                    </select>
                  </div>
                </div>

                <div className="form-checkboxes">
                  <label className="checkbox">
                    <input
                      type="checkbox"
                      checked={formData.wantAssertionsSigned}
                      onChange={(e) => setFormData({ ...formData, wantAssertionsSigned: e.target.checked })}
                    />
                    Require signed assertions
                  </label>
                  <label className="checkbox">
                    <input
                      type="checkbox"
                      checked={formData.wantResponseSigned}
                      onChange={(e) => setFormData({ ...formData, wantResponseSigned: e.target.checked })}
                    />
                    Require signed response
                  </label>
                  <label className="checkbox">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    />
                    Active
                  </label>
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  {editingId ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
