import axios from 'axios';

// Use relative URL to leverage the dev server proxy (when in Docker/browser)
// or full URL when explicitly set via env variable
const API_URL = process.env.REACT_APP_API_URL || '';

const api = axios.create({
  baseURL: API_URL || undefined,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Event emitter for auth state changes (used for session expiration)
export const authEvents = {
  _listeners: new Set<() => void>(),
  subscribe(callback: () => void) {
    this._listeners.add(callback);
    return () => this._listeners.delete(callback);
  },
  emit() {
    this._listeners.forEach(cb => cb());
  }
};

// Track if we've already triggered a session expiration to avoid multiple alerts
let sessionExpiredHandled = false;

export function resetSessionExpiredFlag() {
  sessionExpiredHandled = false;
}

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors (401 Unauthorized) - auto logout
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !sessionExpiredHandled) {
      sessionExpiredHandled = true;
      
      // Check if it's a "User not found" error (DB reset scenario)
      const errorMessage = error.response.data?.error?.message || error.response.data?.error || '';
      
      // Clear auth data from localStorage
      localStorage.removeItem('token');
      localStorage.removeItem('auth-storage');
      
      // Emit event to notify auth store and UI
      authEvents.emit();
      
      // Show alert to user (small delay to let UI update first)
      setTimeout(() => {
        if (errorMessage.includes('User not found')) {
          alert('Your session has expired. Please log in again.');
        } else {
          alert('Your session has expired or you have been logged out. Please log in again.');
        }
        // Redirect to login
        window.location.href = '/login';
      }, 100);
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: (email: string, password: string, mfaToken?: string) =>
    api.post('/api/auth/login', { email, password, mfaToken }),
  register: (email: string, password: string, name?: string) =>
    api.post('/api/auth/register', { email, password, name }),
  me: () => api.get('/api/auth/me'),
  updateProfile: (data: any) => api.patch('/api/auth/profile', data),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post('/api/auth/change-password', { currentPassword, newPassword }),
  completeOnboarding: (email: string, password: string) =>
    api.post('/api/auth/onboarding', { email, password }),
  verifyEmail: (token: string) =>
    api.post('/api/auth/verify-email', { token }),
  resendVerification: (email: string) =>
    api.post('/api/auth/resend-verification', { email })
};

// Workflow API
export const workflowsApi = {
  getAll: () => api.get('/api/workflows'),
  getById: (id: string) => api.get(`/api/workflows/${id}`),
  create: (data: any) => api.post('/api/workflows', data),
  update: (id: string, data: any) => api.patch(`/api/workflows/${id}`, data),
  delete: (id: string) => api.delete(`/api/workflows/${id}`),
  execute: (id: string, data?: any) => api.post(`/api/workflows/${id}/execute`, data),
  getExecutions: (id: string) => api.get(`/api/workflows/${id}/executions`),
  export: (id: string) => api.get(`/api/workflows/${id}/export`, { responseType: 'blob' }),
  import: (data: any) => api.post('/api/workflows/import', data),
  validateImport: (data: any) => api.post('/api/workflows/import/validate', data),
  moveToWorkspace: (id: string, workspaceId: string | null) => 
    api.post(`/api/workflows/${id}/move`, { workspaceId })
};

// Node API
export const nodesApi = {
  getAll: () => api.get('/api/nodes'),
  getCategories: () => api.get('/api/nodes/categories')
};

// Execution API
export const executionsApi = {
  getAll: () => api.get('/api/executions'),
  getById: (id: string) => api.get(`/api/executions/${id}`),
  cancel: (id: string) => api.post(`/api/executions/${id}/cancel`),
  delete: (id: string) => api.delete(`/api/executions/${id}`),
  getNodeExecution: (executionId: string, nodeId: string) => 
    api.get(`/api/executions/${executionId}/nodes/${nodeId}`)
};

// Execution Logs API
export const executionLogsApi = {
  getAll: (params?: any) => api.get('/api/execution-logs', { params }),
  getByExecution: (executionId: string) => api.get(`/api/execution-logs/execution/${executionId}`),
  getStats: () => api.get('/api/execution-logs/stats/overview'),
  getTimeline: (params?: any) => api.get('/api/execution-logs/timeline', { params }),
  export: (executionId: string, format: string) => 
    api.get(`/api/execution-logs/export`, { 
      params: { executionId, format },
      responseType: format === 'csv' ? 'blob' : 'json'
    })
};

// Credential API
export const credentialApi = {
  list: (type?: string) => api.get('/api/credentials', { params: { type } }),
  getById: (id: string) => api.get(`/api/credentials/${id}`),
  create: (data: any) => api.post('/api/credentials', data),
  update: (id: string, data: any) => api.patch(`/api/credentials/${id}`, data),
  delete: (id: string) => api.delete(`/api/credentials/${id}`),
  getTypes: () => api.get('/api/credentials/types/list'),
  decrypt: (id: string) => api.post(`/api/credentials/${id}/decrypt`),
  testVault: (data: any) => api.post('/api/credentials/test-vault', data)
};

// Workspace API
export const workspacesApi = {
  getAll: () => api.get('/api/workspaces'),
  getById: (id: string) => api.get(`/api/workspaces/${id}`),
  create: (data: any) => api.post('/api/workspaces', data),
  update: (id: string, data: any) => api.patch(`/api/workspaces/${id}`, data),
  delete: (id: string) => api.delete(`/api/workspaces/${id}`),
  
  // Members
  addMember: (workspaceId: string, data: any) => 
    api.post(`/api/workspaces/${workspaceId}/members`, data),
  updateMember: (workspaceId: string, memberId: string, data: any) =>
    api.patch(`/api/workspaces/${workspaceId}/members/${memberId}`, data),
  removeMember: (workspaceId: string, memberId: string) =>
    api.delete(`/api/workspaces/${workspaceId}/members/${memberId}`),
  
  // Workflows
  getWorkflows: (id: string) => api.get(`/api/workspaces/${id}/workflows`),
  addWorkflow: (workspaceId: string, workflowId: string) =>
    api.post(`/api/workspaces/${workspaceId}/workflows/${workflowId}`)
};

// Groups API
export const groupsApi = {
  getAll: () => api.get('/api/groups'),
  getByWorkspace: (workspaceId: string) => api.get(`/api/groups/workspace/${workspaceId}`),
  create: (data: any) => api.post('/api/groups', data),
  update: (id: string, data: any) => api.patch(`/api/groups/${id}`, data),
  delete: (id: string) => api.delete(`/api/groups/${id}`),
  
  // Members
  addMember: (groupId: string, userId: string) =>
    api.post(`/api/groups/${groupId}/members`, { userId }),
  removeMember: (groupId: string, memberId: string) =>
    api.delete(`/api/groups/${groupId}/members/${memberId}`),
  
  // Workspace Access
  addWorkspaceAccess: (groupId: string, workspaceId: string, role?: string) =>
    api.post(`/api/groups/${groupId}/workspaces`, { workspaceId, role }),
  removeWorkspaceAccess: (groupId: string, accessId: string) =>
    api.delete(`/api/groups/${groupId}/workspaces/${accessId}`)
};

// User API
export const usersApi = {
  getAll: () => api.get('/api/users'),
  create: (data: any) => api.post('/api/users', data),
  update: (id: string, data: any) => api.patch(`/api/users/${id}`, data),
  delete: (id: string) => api.delete(`/api/users/${id}`)
};

// API Key API
export const apiKeysApi = {
  getAll: () => api.get('/api/api-keys'),
  create: (name: string) => api.post('/api/api-keys', { name }),
  delete: (id: string) => api.delete(`/api/api-keys/${id}`)
};

// Admin API
export const adminApi = {
  getAllWorkflows: () => api.get('/api/admin/workflows'),
  deleteWorkflow: (id: string) => api.delete(`/api/admin/workflows/${id}`),
  toggleWorkflow: (id: string) => api.patch(`/api/admin/workflows/${id}/toggle`),
  moveWorkflow: (id: string, workspaceId: string | null) => api.post(`/api/admin/workflows/${id}/move`, { workspaceId })
};

// Logs API
export const logsApi = {
  getLogFiles: () => api.get('/api/logs'),
  getLogs: (logName: string, lines: number, search?: string) => 
    api.get(`/api/logs/${logName}?lines=${lines}${search ? `&search=${encodeURIComponent(search)}` : ''}`),
  downloadLogs: (logName: string) => api.get(`/api/logs/${logName}/download`, { responseType: 'blob' }),
  clearLogs: (logName: string) => api.delete(`/api/logs/${logName}`)
};

// System API
export const systemApi = {
  getSystemStats: () => api.get('/api/system/stats'),
  getMaintenanceSettings: () => api.get('/api/system/maintenance'),
  updateMaintenanceSettings: (settings: any) => api.patch('/api/system/maintenance', settings),
  getPurgePreview: () => api.get('/api/system/maintenance/purge-preview'),
  runManualPurge: () => api.post('/api/system/maintenance/purge'),
  getSecuritySettings: () => api.get('/api/system/security'),
  updateSecuritySettings: (settings: any) => api.patch('/api/system/security', settings),
  getEmailSettings: () => api.get('/api/system/email'),
  updateEmailSettings: (settings: any) => api.patch('/api/system/email', settings),
  testEmailSettings: (testEmail: string) => api.post('/api/system/email/test', { testEmail }),
  getGeneralSettings: () => api.get('/api/system/general'),
  updateGeneralSettings: (settings: any) => api.patch('/api/system/general', settings)
};

// Templates API
export const templatesApi = {
  getAll: (params?: any) => api.get('/api/templates', { params }),
  getById: (id: string) => api.get(`/api/templates/${id}`),
  getCategories: () => api.get('/api/templates/categories/list'),
  createFromTemplate: (id: string, data: any) => api.post(`/api/templates/${id}/create`, data)
};

// Scheduler API
export const schedulerApi = {
  getStatus: () => api.get('/api/scheduler/status'),
  getTriggers: (enabledOnly?: boolean) => api.get('/api/scheduler/triggers', { params: enabledOnly ? { enabled: 'true' } : {} }),
  setEnabled: (id: string, enabled: boolean) => api.patch(`/api/scheduler/triggers/${id}`, { enabled }),
  runNow: (id: string) => api.post(`/api/scheduler/triggers/${id}/run`)
};

// MFA API
export const mfaApi = {
  setup: () => api.post('/api/auth/mfa/setup'),
  verify: (token: string) => api.post('/api/auth/mfa/verify', { token }),
  disable: (token: string, password: string) => api.post('/api/auth/mfa/disable', { token, password }),
  getStatus: () => api.get('/api/auth/mfa/status'),
  useBackupCode: (email: string, backupCode: string) => api.post('/api/auth/mfa/backup', { email, backupCode })
};

// SAML API
export const samlApi = {
  getConfig: () => api.get('/api/auth/saml/config'),
  createConfig: (data: any) => api.post('/api/auth/saml/config', data),
  updateConfig: (id: string, data: any) => api.patch(`/api/auth/saml/config/${id}`, data),
  deleteConfig: (id: string) => api.delete(`/api/auth/saml/config/${id}`),
  getProviders: () => api.get('/api/auth/saml/providers')
};

export default api;
