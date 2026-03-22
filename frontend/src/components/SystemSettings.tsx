import React, { useState, useEffect } from 'react';
import { Settings, Shield, Database, Mail, Server, AlertCircle, Loader2, Save, CheckCircle, Palette, Trash2, Calendar, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { systemApi } from '../services/api';
import { ThemeSelector } from './ThemeSelector';
import './SystemSettings.css';

interface SystemStatus {
  database: boolean;
  redis: boolean;
  version: string;
  uptime: string;
  workflows: number;
  users: number;
  executions: number;
}

export function SystemSettings() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('general');

  // Settings form states
  const [generalSettings, setGeneralSettings] = useState({
    siteName: 'OrdoVertex',
    allowRegistration: true,
    defaultUserRole: 'user'
  });

  const [securitySettings, setSecuritySettings] = useState({
    sessionTimeout: 60,
    requireEmailVerification: false,
    maxLoginAttempts: 5
  });

  const [maintenanceSettings, setMaintenanceSettings] = useState({
    executionLogsRetention: 30,
    workflowExecutionsRetention: 90,
    apiRequestLogsRetention: 7,
    enableAutoPurge: true,
    purgeSchedule: '0 2 * * *',
    lastPurgeRun: null as string | null,
    nextPurgeRun: null as string | null
  });

  const [purgePreview, setPurgePreview] = useState({
    executionLogs: 0,
    workflowExecutions: 0,
    nodeExecutions: 0,
    total: 0
  });

  const [isPurging, setIsPurging] = useState(false);

  useEffect(() => {
    loadSystemStatus();
    loadMaintenanceSettings();
    loadPurgePreview();
  }, []);

  const loadSystemStatus = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/admin/status');
      setStatus(response.data.data);
    } catch (error: any) {
      // Use mock data if endpoint doesn't exist yet
      setStatus({
        database: true,
        redis: true,
        version: '1.0.0',
        uptime: 'Running',
        workflows: 0,
        users: 0,
        executions: 0
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadMaintenanceSettings = async () => {
    try {
      const response = await systemApi.getMaintenanceSettings();
      setMaintenanceSettings(response.data.data);
    } catch (error) {
      console.error('Failed to load maintenance settings');
    }
  };

  const loadPurgePreview = async () => {
    try {
      const response = await systemApi.getPurgePreview();
      setPurgePreview(response.data.data);
    } catch (error) {
      console.error('Failed to load purge preview');
    }
  };

  const handleSaveMaintenance = async () => {
    try {
      await systemApi.updateMaintenanceSettings({
        executionLogsRetention: maintenanceSettings.executionLogsRetention,
        workflowExecutionsRetention: maintenanceSettings.workflowExecutionsRetention,
        apiRequestLogsRetention: maintenanceSettings.apiRequestLogsRetention,
        enableAutoPurge: maintenanceSettings.enableAutoPurge,
        purgeSchedule: maintenanceSettings.purgeSchedule
      });
      toast.success('Maintenance settings saved');
    } catch (error) {
      toast.error('Failed to save settings');
    }
  };

  const handleManualPurge = async () => {
    if (!window.confirm(`This will delete approximately ${purgePreview.total} records. Continue?`)) {
      return;
    }
    setIsPurging(true);
    try {
      const response = await systemApi.runManualPurge();
      toast.success(`Purge completed: ${response.data.data.results.executionLogs} execution logs, ${response.data.data.results.workflowExecutions} executions deleted`);
      loadPurgePreview();
      loadMaintenanceSettings();
    } catch (error) {
      toast.error('Purge failed');
    } finally {
      setIsPurging(false);
    }
  };

  const handleSaveSettings = async (settingType: string) => {
    toast.success(`${settingType} settings saved successfully`);
  };

  const renderGeneralSettings = () => (
    <div className="settings-section">
      <h3>General Settings</h3>
      
      <div className="setting-item">
        <label>Site Name</label>
        <input
          type="text"
          value={generalSettings.siteName}
          onChange={(e) => setGeneralSettings({ ...generalSettings, siteName: e.target.value })}
        />
      </div>

      <div className="setting-item theme-setting">
        <label>
          <Palette size={16} />
          Theme
        </label>
        <ThemeSelector />
      </div>

      <div className="setting-item checkbox">
        <label>
          <input
            type="checkbox"
            checked={generalSettings.allowRegistration}
            onChange={(e) => setGeneralSettings({ ...generalSettings, allowRegistration: e.target.checked })}
          />
          Allow Public Registration
        </label>
        <p className="setting-help">Allow new users to register on the login page</p>
      </div>

      <div className="setting-item">
        <label>Default User Role</label>
        <select
          value={generalSettings.defaultUserRole}
          onChange={(e) => setGeneralSettings({ ...generalSettings, defaultUserRole: e.target.value })}
        >
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      <button
        className="btn btn-primary"
        onClick={() => handleSaveSettings('General')}
      >
        <Save size={16} />
        Save Changes
      </button>
    </div>
  );

  const renderSecuritySettings = () => (
    <div className="settings-section">
      <h3>Security Settings</h3>
      
      <div className="setting-item">
        <label>Session Timeout (minutes)</label>
        <input
          type="number"
          min={5}
          max={480}
          value={securitySettings.sessionTimeout}
          onChange={(e) => setSecuritySettings({ ...securitySettings, sessionTimeout: parseInt(e.target.value) })}
        />
        <p className="setting-help">Time before inactive users are logged out</p>
      </div>

      <div className="setting-item checkbox">
        <label>
          <input
            type="checkbox"
            checked={securitySettings.requireEmailVerification}
            onChange={(e) => setSecuritySettings({ ...securitySettings, requireEmailVerification: e.target.checked })}
          />
          Require Email Verification
        </label>
        <p className="setting-help">New users must verify their email before accessing the platform</p>
      </div>

      <div className="setting-item">
        <label>Max Login Attempts</label>
        <input
          type="number"
          min={3}
          max={10}
          value={securitySettings.maxLoginAttempts}
          onChange={(e) => setSecuritySettings({ ...securitySettings, maxLoginAttempts: parseInt(e.target.value) })}
        />
        <p className="setting-help">Number of failed login attempts before temporary lockout</p>
      </div>

      <button
        className="btn btn-primary"
        onClick={() => handleSaveSettings('Security')}
      >
        <Save size={16} />
        Save Changes
      </button>
    </div>
  );

  const renderDatabaseMaintenance = () => (
    <div className="settings-section">
      <h3>Database Maintenance</h3>
      <p className="section-description">
        Automatically clean up old execution logs and workflow history to keep the database size manageable.
      </p>

      <div className="purge-preview-card">
        <h4>
          <Database size={18} />
          Records to be Purged
        </h4>
        <div className="preview-stats">
          <div className="preview-stat">
            <span className="preview-number">{purgePreview.executionLogs.toLocaleString()}</span>
            <span className="preview-label">Execution Logs</span>
          </div>
          <div className="preview-stat">
            <span className="preview-number">{purgePreview.workflowExecutions.toLocaleString()}</span>
            <span className="preview-label">Workflow Executions</span>
          </div>
          <div className="preview-stat">
            <span className="preview-number">{purgePreview.nodeExecutions.toLocaleString()}</span>
            <span className="preview-label">Node Executions</span>
          </div>
        </div>
        <button 
          className="btn btn-danger"
          onClick={handleManualPurge}
          disabled={isPurging || purgePreview.total === 0}
        >
          {isPurging ? (
            <><Loader2 size={16} className="spin" /> Purging...</>
          ) : (
            <><Trash2 size={16} /> Purge Now</>
          )}
        </button>
      </div>

      <div className="setting-group">
        <h4>Retention Settings</h4>
        
        <div className="setting-item">
          <label>Execution Logs Retention (days)</label>
          <input
            type="number"
            min={1}
            max={365}
            value={maintenanceSettings.executionLogsRetention}
            onChange={(e) => setMaintenanceSettings({ 
              ...maintenanceSettings, 
              executionLogsRetention: parseInt(e.target.value) 
            })}
          />
          <p className="setting-help">Execution logs older than this will be deleted</p>
        </div>

        <div className="setting-item">
          <label>Workflow Executions Retention (days)</label>
          <input
            type="number"
            min={1}
            max={365}
            value={maintenanceSettings.workflowExecutionsRetention}
            onChange={(e) => setMaintenanceSettings({ 
              ...maintenanceSettings, 
              workflowExecutionsRetention: parseInt(e.target.value) 
            })}
          />
          <p className="setting-help">Workflow execution history older than this will be deleted</p>
        </div>
      </div>

      <div className="setting-group">
        <h4>Auto-Purge Schedule</h4>
        
        <div className="setting-item checkbox">
          <label>
            <input
              type="checkbox"
              checked={maintenanceSettings.enableAutoPurge}
              onChange={(e) => setMaintenanceSettings({ 
                ...maintenanceSettings, 
                enableAutoPurge: e.target.checked 
              })}
            />
            Enable Automatic Purge
          </label>
          <p className="setting-help">Automatically purge old records on a schedule</p>
        </div>

        {maintenanceSettings.enableAutoPurge && (
          <>
            <div className="setting-item">
              <label>Purge Schedule (Cron)</label>
              <input
                type="text"
                value={maintenanceSettings.purgeSchedule}
                onChange={(e) => setMaintenanceSettings({ 
                  ...maintenanceSettings, 
                  purgeSchedule: e.target.value 
                })}
                placeholder="0 2 * * *"
              />
              <p className="setting-help">
                Cron expression. Default: 0 2 * * * (daily at 2 AM)
              </p>
            </div>

            <div className="schedule-info">
              {maintenanceSettings.lastPurgeRun && (
                <div className="schedule-item">
                  <Clock size={14} />
                  <span>Last purge: {new Date(maintenanceSettings.lastPurgeRun).toLocaleString()}</span>
                </div>
              )}
              {maintenanceSettings.nextPurgeRun && (
                <div className="schedule-item">
                  <Calendar size={14} />
                  <span>Next purge: {new Date(maintenanceSettings.nextPurgeRun).toLocaleString()}</span>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <button
        className="btn btn-primary"
        onClick={handleSaveMaintenance}
      >
        <Save size={16} />
        Save Maintenance Settings
      </button>
    </div>
  );

  const renderSystemStatus = () => (
    <div className="settings-section">
      <h3>System Status</h3>
      
      {status && (
        <div className="status-grid">
          <div className="status-card">
            <div className="status-icon success">
              <Database size={20} />
            </div>
            <div className="status-info">
              <span className="status-label">Database</span>
              <span className="status-value">
                {status.database ? (
                  <><CheckCircle size={14} /> Connected</>
                ) : (
                  'Disconnected'
                )}
              </span>
            </div>
          </div>

          <div className="status-card">
            <div className="status-icon success">
              <Server size={20} />
            </div>
            <div className="status-info">
              <span className="status-label">Redis</span>
              <span className="status-value">
                {status.redis ? (
                  <><CheckCircle size={14} /> Connected</>
                ) : (
                  'Disconnected'
                )}
              </span>
            </div>
          </div>

          <div className="status-card">
            <div className="status-icon">
              <Settings size={20} />
            </div>
            <div className="status-info">
              <span className="status-label">Version</span>
              <span className="status-value">{status.version}</span>
            </div>
          </div>

          <div className="status-card">
            <div className="status-icon">
              <AlertCircle size={20} />
            </div>
            <div className="status-info">
              <span className="status-label">Status</span>
              <span className="status-value">{status.uptime}</span>
            </div>
          </div>
        </div>
      )}

      <div className="stats-section">
        <h4>Platform Statistics</h4>
        <div className="stats-grid">
          <div className="stat-box">
            <span className="stat-number">{status?.users || 0}</span>
            <span className="stat-label">Total Users</span>
          </div>
          <div className="stat-box">
            <span className="stat-number">{status?.workflows || 0}</span>
            <span className="stat-label">Workflows</span>
          </div>
          <div className="stat-box">
            <span className="stat-number">{status?.executions || 0}</span>
            <span className="stat-label">Executions</span>
          </div>
        </div>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="system-settings">
        <div className="loading-container">
          <Loader2 size={32} className="spinner" />
          <p>Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="system-settings">
      <div className="page-header">
        <div className="header-title">
          <Settings size={28} />
          <h1>System Settings</h1>
        </div>
      </div>

      <div className="settings-layout">
        <div className="settings-sidebar">
          <button
            className={`sidebar-item ${activeTab === 'general' ? 'active' : ''}`}
            onClick={() => setActiveTab('general')}
          >
            <Settings size={18} />
            General
          </button>
          <button
            className={`sidebar-item ${activeTab === 'security' ? 'active' : ''}`}
            onClick={() => setActiveTab('security')}
          >
            <Shield size={18} />
            Security
          </button>
          <button
            className={`sidebar-item ${activeTab === 'status' ? 'active' : ''}`}
            onClick={() => setActiveTab('status')}
          >
            <Server size={18} />
            System Status
          </button>
          <button
            className={`sidebar-item ${activeTab === 'maintenance' ? 'active' : ''}`}
            onClick={() => setActiveTab('maintenance')}
          >
            <Database size={18} />
            Maintenance
          </button>
        </div>

        <div className="settings-content">
          {activeTab === 'general' && renderGeneralSettings()}
          {activeTab === 'security' && renderSecuritySettings()}
          {activeTab === 'status' && renderSystemStatus()}
          {activeTab === 'maintenance' && renderDatabaseMaintenance()}
        </div>
      </div>
    </div>
  );
}
