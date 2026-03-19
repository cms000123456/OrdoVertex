import React, { useEffect, useState, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams, Outlet, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';
import { useWorkflowStore } from './store/workflowStore';
import { workflowsApi } from './services/api';
import { Workflow } from './types';
import toast from 'react-hot-toast';

import { Login } from './components/Login';
import { WorkflowsList } from './components/WorkflowsList';
import { WorkflowEditor } from './components/WorkflowEditor';
import { AdminMenu } from './components/AdminMenu';
import { WorkflowSelector } from './components/WorkflowSelector';
import { HelpMenu } from './components/HelpMenu';
import { HelpCenter } from './components/HelpCenter';
import { UserManagement } from './components/UserManagement';
import { ApiKeyManagement } from './components/ApiKeyManagement';
import { SystemSettings } from './components/SystemSettings';
import { ThemeSelector, ThemeSelectorCompact } from './components/ThemeSelector';
import { TemplatesGallery } from './components/TemplatesGallery';
import { MFASetup } from './components/MFASetup';
import { SAMLConfig } from './components/SAMLConfig';
import { ExecutionLogs } from './components/ExecutionLogs';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import './App.css';

// Protected route component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}

// Public route component (redirects if authenticated)
function PublicRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return !isAuthenticated ? <>{children}</> : <Navigate to="/workflows" />;
}

// Main layout with navigation
function MainLayout() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <div className="app-layout">
      <nav className="main-nav">
        <div className="nav-brand" onClick={() => navigate('/workflows')} style={{ cursor: 'pointer' }}>
          <span className="nav-logo">OrdoVertex</span>
        </div>
        <div className="nav-items">
          <div className="nav-theme-selector">
            <ThemeSelectorCompact />
          </div>
          <AdminMenu />
          <HelpMenu />
        </div>
        <div className="nav-user">
          <div className="user-menu-container">
            <button 
              className="user-menu-btn"
              onClick={() => setShowUserMenu(!showUserMenu)}
            >
              <span className="user-email">{user?.email}</span>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            {showUserMenu && (
              <div className="user-dropdown">
                <button onClick={() => { navigate('/execution-logs'); setShowUserMenu(false); }}>
                  Execution Logs
                </button>
                <button onClick={() => { navigate('/settings/mfa'); setShowUserMenu(false); }}>
                  Security (MFA)
                </button>
                <button onClick={() => { navigate('/admin/api-keys'); setShowUserMenu(false); }}>
                  API Keys
                </button>
                <hr />
                <button onClick={logout} className="logout-btn">
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <KeyboardShortcutsWrapper />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#1e293b',
            color: '#fff',
            padding: '12px 16px',
            borderRadius: '8px'
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff'
            }
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff'
            }
          }
        }}
      />
      
      <Routes>
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
          <Route path="/workflows" element={<WorkflowsList />} />
          <Route path="/workflows/new" element={<TemplatesGallery />} />
          <Route path="/workflows/:id" element={<WorkflowEditorWithData />} />
          {/* Admin routes */}
          <Route path="/admin/users" element={<UserManagement />} />
          <Route path="/admin/workflows" element={<div style={{ padding: 40, textAlign: 'center' }}><h2>All Workflows</h2><p>Admin page placeholder - Coming soon</p></div>} />
          <Route path="/admin/api-keys" element={<ApiKeyManagement />} />
          <Route path="/admin/saml" element={<SAMLConfig />} />
          <Route path="/admin/execution-logs" element={<ExecutionLogs />} />
          <Route path="/admin/settings" element={<SystemSettings />} />
          {/* Help routes */}
          <Route path="/help" element={<HelpCenter />} />
          {/* User settings */}
          <Route path="/settings/mfa" element={<MFASetup />} />
          {/* Execution logs - accessible to all users */}
          <Route path="/execution-logs" element={<ExecutionLogs />} />
        </Route>
        <Route path="/" element={<Navigate to="/workflows" />} />
      </Routes>
    </BrowserRouter>
  );
}

// Wrapper component for keyboard shortcuts
function KeyboardShortcutsWrapper() {
  useKeyboardShortcuts();
  return null;
}

// Wrapper component to load workflow data
function WorkflowEditorWithData() {
  const { id } = useParams<{ id: string }>();
  const [isLoading, setIsLoading] = useState(true);
  const setCurrentWorkflow = useWorkflowStore((state) => state.setCurrentWorkflow);

  useEffect(() => {
    const loadWorkflow = async () => {
      if (!id) return;
      
      try {
        const response = await workflowsApi.getById(id);
        const workflow: Workflow = response.data.data;
        setCurrentWorkflow(workflow);
      } catch (error) {
        toast.error('Failed to load workflow');
      } finally {
        setIsLoading(false);
      }
    };

    loadWorkflow();

    // Cleanup when unmounting
    return () => {
      setCurrentWorkflow(null);
    };
  }, [id, setCurrentWorkflow]);

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading workflow...</p>
      </div>
    );
  }

  return <WorkflowEditor />;
}

export default App;
