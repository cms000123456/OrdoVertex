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

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API
export const authApi = {
  login: (email: string, password: string, mfaToken?: string) =>
    api.post('/api/auth/login', { email, password, mfaToken }),
  register: (email: string, password: string, name?: string) =>
    api.post('/api/auth/register', { email, password, name }),
  me: () => api.get('/api/auth/me'),
  updateProfile: (data: any) => api.patch('/api/auth/profile', data),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post('/api/auth/change-password', { currentPassword, newPassword })
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
  validateImport: (data: any) => api.post('/api/workflows/import/validate', data)
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
  cancel: (id: string) => api.post(`/api/executions/${id}/cancel`)
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

// Templates API
export const templatesApi = {
  getAll: (params?: any) => api.get('/api/templates', { params }),
  getById: (id: string) => api.get(`/api/templates/${id}`),
  getCategories: () => api.get('/api/templates/categories/list'),
  createFromTemplate: (id: string, data: any) => api.post(`/api/templates/${id}/create`, data)
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
