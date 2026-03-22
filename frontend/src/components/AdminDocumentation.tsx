import React, { useState } from 'react';
import { 
  Book, Users, Building2, UsersRound, Workflow, Key, 
  Lock, Terminal, Activity, Settings, ChevronDown, ChevronRight,
  Shield, AlertCircle, CheckCircle, Info
} from 'lucide-react';
import './AdminDocumentation.css';

interface Section {
  id: string;
  title: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

export function AdminDocumentation() {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['overview']));

  const toggleSection = (id: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedSections(newExpanded);
  };

  const sections: Section[] = [
    {
      id: 'overview',
      title: 'Admin Overview',
      icon: <Shield size={20} />,
      content: (
        <div className="doc-content">
          <p className="doc-intro">
            The Admin Menu provides system-wide management capabilities for administrators. 
            Access to these features requires the <strong>admin</strong> role.
          </p>
          
          <div className="doc-alert doc-alert-info">
            <Info size={18} />
            <div>
              <strong>Note:</strong> Admin features affect all users and workspaces. 
              Use with caution and ensure you understand the impact of your actions.
            </div>
          </div>

          <h4>Available Admin Features</h4>
          <ul className="doc-list">
            <li><strong>User Management</strong> - Create, edit, and delete user accounts</li>
            <li><strong>Workspaces</strong> - Manage workspaces, members, and group assignments</li>
            <li><strong>Groups & Teams</strong> - Organize users into groups for easier access control</li>
            <li><strong>All Workflows</strong> - View and manage workflows across all users</li>
            <li><strong>API Keys</strong> - Manage system-wide API keys</li>
            <li><strong>SAML SSO</strong> - Configure Single Sign-On authentication</li>
            <li><strong>Execution Logs</strong> - Monitor workflow executions</li>
            <li><strong>Performance</strong> - View system resource usage</li>
            <li><strong>System Settings</strong> - Configure global system settings</li>
          </ul>
        </div>
      )
    },
    {
      id: 'users',
      title: 'User Management',
      icon: <Users size={20} />,
      content: (
        <div className="doc-content">
          <p className="doc-intro">
            Manage user accounts, roles, and access to the platform.
          </p>

          <h4>Creating Users</h4>
          <ol className="doc-steps">
            <li>Navigate to <strong>Admin → User Management</strong></li>
            <li>Click <strong>Add User</strong> button</li>
            <li>Enter user details:
              <ul>
                <li>Email (required, must be unique)</li>
                <li>Name (optional)</li>
                <li>Password (minimum 6 characters)</li>
                <li>Role (User or Admin)</li>
              </ul>
            </li>
            <li>Click <strong>Create User</strong></li>
          </ol>

          <h4>Changing User Roles</h4>
          <ol className="doc-steps">
            <li>Find the user in the list</li>
            <li>Click the role dropdown (shows current role)</li>
            <li>Select new role (User or Admin)</li>
          </ol>

          <div className="doc-alert doc-alert-warning">
            <AlertCircle size={18} />
            <div>
              <strong>Important:</strong> You cannot demote yourself from admin. 
              Another admin must change your role.
            </div>
          </div>

          <h4>Deleting Users</h4>
          <ol className="doc-steps">
            <li>Find the user in the list</li>
            <li>Click the trash icon</li>
            <li>Confirm deletion</li>
          </ol>

          <div className="doc-alert doc-alert-danger">
            <AlertCircle size={18} />
            <div>
              <strong>Warning:</strong> Deleting a user will also delete all their workflows 
              and data. This cannot be undone.
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'workspaces',
      title: 'Workspace Management',
      icon: <Building2 size={20} />,
      content: (
        <div className="doc-content">
          <p className="doc-intro">
            Workspaces organize workflows, credentials, and teams. Each workspace has its own 
            isolated environment.
          </p>

          <h4>Creating Workspaces</h4>
          <ol className="doc-steps">
            <li>Navigate to <strong>Admin → Workspaces</strong></li>
            <li>Click <strong>Create Workspace</strong></li>
            <li>Enter workspace details:
              <ul>
                <li>Name (required)</li>
                <li>Description (optional)</li>
              </ul>
            </li>
            <li>Click <strong>Create</strong></li>
          </ol>

          <h4>Managing Workspace Members</h4>
          <ol className="doc-steps">
            <li>Expand a workspace by clicking on it</li>
            <li>Under <strong>Members</strong>, click <strong>Add Member</strong></li>
            <li>Select a user from the dropdown</li>
            <li>Choose role:
              <ul>
                <li><strong>Viewer</strong> - Can view workflows and executions</li>
                <li><strong>Editor</strong> - Can create and edit workflows</li>
                <li><strong>Admin</strong> - Can manage workspace settings and members</li>
              </ul>
            </li>
            <li>Click <strong>Add</strong></li>
          </ol>

          <h4>Assigning Groups to Workspaces</h4>
          <ol className="doc-steps">
            <li>Expand a workspace</li>
            <li>Under <strong>Groups with Access</strong>, click <strong>Assign Group</strong></li>
            <li>Select a group from the dropdown</li>
            <li>Choose permission level (Viewer or Editor)</li>
            <li>Click <strong>Assign</strong></li>
          </ol>

          <h4>Removing Access</h4>
          <p>Click the <strong>×</strong> button next to any member or group to remove access.</p>

          <div className="doc-alert doc-alert-info">
            <Info size={18} />
            <div>
              <strong>Tip:</strong> The workspace owner has full control and cannot be removed 
              by other admins.
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'groups',
      title: 'Groups & Teams',
      icon: <UsersRound size={20} />,
      content: (
        <div className="doc-content">
          <p className="doc-intro">
            Groups organize users for easier access management. Groups can be assigned to 
            multiple workspaces at once.
          </p>

          <h4>Creating Groups</h4>
          <ol className="doc-steps">
            <li>Navigate to <strong>Admin → Groups & Teams</strong></li>
            <li>Click <strong>Create Group</strong></li>
            <li>Enter group details:
              <ul>
                <li>Name (required)</li>
                <li>Description (optional)</li>
                <li>Workspaces (optional - can be assigned later)</li>
              </ul>
            </li>
            <li>Click <strong>Create</strong></li>
          </ol>

          <div className="doc-alert doc-alert-info">
            <Info size={18} />
            <div>
              <strong>Note:</strong> Groups can be created as "standalone" without any workspace 
              assignment. You can assign workspaces later.
            </div>
          </div>

          <h4>Adding Members to Groups</h4>
          <ol className="doc-steps">
            <li>Find the group and expand it</li>
            <li>Click <strong>Add Member</strong></li>
            <li>Select a user from the dropdown</li>
            <li>Click <strong>Add</strong></li>
          </ol>

          <h4>Assigning Workspace Access</h4>
          <ol className="doc-steps">
            <li>Find the group and expand it</li>
            <li>Under <strong>Workspace Access</strong>, click <strong>Assign</strong></li>
            <li>Select a workspace from the dropdown</li>
            <li>Click <strong>Add</strong></li>
          </ol>

          <h4>Permission Logic</h4>
          <ul className="doc-list">
            <li><strong>Standalone Groups:</strong> Can have any users as members</li>
            <li><strong>Workspace-Linked Groups:</strong> Members must be workspace members first</li>
            <li><strong>Multi-Workspace:</strong> Admins can assign groups to multiple workspaces</li>
          </ul>
        </div>
      )
    },
    {
      id: 'workflows',
      title: 'All Workflows',
      icon: <Workflow size={20} />,
      content: (
        <div className="doc-content">
          <p className="doc-intro">
            View and manage all workflows across the entire platform, regardless of owner 
            or workspace.
          </p>

          <h4>Viewing Workflows</h4>
          <ul className="doc-list">
            <li>See workflow name, owner, workspace, and status</li>
            <li>View execution count and last updated time</li>
            <li>Search by name, description, owner, or workspace</li>
          </ul>

          <h4>Actions</h4>
          <table className="doc-table">
            <thead>
              <tr>
                <th>Action</th>
                <th>Icon</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Move</td>
                <td><MoveIcon /></td>
                <td>Move workflow to a different workspace or make it personal</td>
              </tr>
              <tr>
                <td>Toggle</td>
                <td><PowerIcon /></td>
                <td>Activate or deactivate the workflow</td>
              </tr>
              <tr>
                <td>Open</td>
                <td><ExternalIcon /></td>
                <td>Open workflow in the editor</td>
              </tr>
              <tr>
                <td>Delete</td>
                <td><TrashIcon /></td>
                <td>Permanently delete the workflow</td>
              </tr>
            </tbody>
          </table>

          <h4>Moving Workflows</h4>
          <ol className="doc-steps">
            <li>Click the <strong>Move</strong> button (purple icon)</li>
            <li>Select target workspace from dropdown, or choose <strong>Personal</strong></li>
            <li>Click <strong>Move Workflow</strong></li>
          </ol>

          <div className="doc-alert doc-alert-warning">
            <AlertCircle size={18} />
            <div>
              <strong>Caution:</strong> Moving a workflow to a different workspace may affect 
              access permissions for existing users.
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'apikeys',
      title: 'API Keys',
      icon: <Key size={20} />,
      content: (
        <div className="doc-content">
          <p className="doc-intro">
            Manage API keys for programmatic access to the platform.
          </p>

          <h4>Creating API Keys</h4>
          <ol className="doc-steps">
            <li>Navigate to <strong>Admin → API Keys</strong></li>
            <li>Click <strong>Generate New Key</strong></li>
            <li>Enter a name for the key</li>
            <li>Copy the key immediately (it won't be shown again)</li>
          </ol>

          <div className="doc-alert doc-alert-danger">
            <AlertCircle size={18} />
            <div>
              <strong>Security:</strong> API keys grant full admin access. Store them securely 
              and rotate regularly.
            </div>
          </div>

          <h4>Using API Keys</h4>
          <p>Include the API key in requests:</p>
          <pre className="doc-code">
{`curl -H "X-API-Key: your_api_key_here" \
     https://api.ordovertex.com/api/workflows`}
          </pre>

          <h4>Revoking Keys</h4>
          <p>Click the <strong>Revoke</strong> button to immediately disable a key.</p>
        </div>
      )
    },
    {
      id: 'saml',
      title: 'SAML SSO',
      icon: <Lock size={20} />,
      content: (
        <div className="doc-content">
          <p className="doc-intro">
            Configure SAML Single Sign-On for enterprise authentication.
          </p>

          <h4>Supported Providers</h4>
          <ul className="doc-list">
            <li>Okta</li>
            <li>Azure AD</li>
            <li>Google Workspace</li>
            <li>Any SAML 2.0 compatible provider</li>
          </ul>

          <h4>Configuration Steps</h4>
          <ol className="doc-steps">
            <li>Navigate to <strong>Admin → SAML SSO</strong></li>
            <li>Click <strong>Add Configuration</strong></li>
            <li>Enter provider details:
              <ul>
                <li>Provider name</li>
                <li>Entity ID</li>
                <li>SSO URL (IdP)</li>
                <li>Certificate (X.509)</li>
              </ul>
            </li>
            <li>Save configuration</li>
            <li>Test login with a new browser session</li>
          </ol>

          <h4>Required Information from Your IdP</h4>
          <ul className="doc-list">
            <li><strong>ACS URL:</strong> <code>https://your-domain.com/api/auth/saml/acs</code></li>
            <li><strong>Entity ID:</strong> <code>ordovertex</code></li>
          </ul>
        </div>
      )
    },
    {
      id: 'logs',
      title: 'Execution Logs',
      icon: <Terminal size={20} />,
      content: (
        <div className="doc-content">
          <p className="doc-intro">
            Monitor workflow executions across the platform. View logs, errors, and performance metrics.
          </p>

          <h4>Log Levels</h4>
          <ul className="doc-list">
            <li><span className="log-level debug">Debug</span> - Detailed diagnostic information</li>
            <li><span className="log-level info">Info</span> - General information</li>
            <li><span className="log-level warn">Warning</span> - Non-critical issues</li>
            <li><span className="log-level error">Error</span> - Critical errors</li>
          </ul>

          <h4>Filtering Logs</h4>
          <ul className="doc-list">
            <li>By workflow</li>
            <li>By execution</li>
            <li>By log level</li>
            <li>By date range</li>
            <li>By node type</li>
          </ul>

          <h4>Log Retention</h4>
          <p>Execution logs are retained based on system settings. Configure retention in System Settings.</p>
        </div>
      )
    },
    {
      id: 'performance',
      title: 'Performance Monitor',
      icon: <Activity size={20} />,
      content: (
        <div className="doc-content">
          <p className="doc-intro">
            Monitor system resource usage and performance metrics.
          </p>

          <h4>Metrics</h4>
          <table className="doc-table">
            <thead>
              <tr>
                <th>Metric</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>CPU Usage</td>
                <td>System CPU load average</td>
              </tr>
              <tr>
                <td>Memory</td>
                <td>Used vs total RAM</td>
              </tr>
              <tr>
                <td>Disk</td>
                <td>Storage usage</td>
              </tr>
              <tr>
                <td>Queue</td>
                <td>Pending workflow executions</td>
              </tr>
            </tbody>
          </table>

          <h4>Auto-Refresh</h4>
          <p>The dashboard auto-refreshes every 30 seconds. Click <strong>Refresh Now</strong> for immediate update.</p>
        </div>
      )
    },
    {
      id: 'settings',
      title: 'System Settings',
      icon: <Settings size={20} />,
      content: (
        <div className="doc-content">
          <p className="doc-intro">
            Configure global system settings and defaults.
          </p>

          <h4>Available Settings</h4>
          <ul className="doc-list">
            <li><strong>General</strong> - Instance name, timezone, language</li>
            <li><strong>Security</strong> - Session timeout, password policy, 2FA</li>
            <li><strong>Execution</strong> - Default timeout, concurrency limits</li>
            <li><strong>Logging</strong> - Log level, retention period</li>
            <li><strong>Email</strong> - SMTP settings for notifications</li>
            <li><strong>Storage</strong> - File storage configuration</li>
          </ul>

          <div className="doc-alert doc-alert-warning">
            <AlertCircle size={18} />
            <div>
              <strong>Note:</strong> Some settings require a system restart to take effect.
            </div>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="admin-documentation">
      <div className="doc-header">
        <Book size={28} />
        <h1>Admin Documentation</h1>
        <p>Complete guide to administering OrdoVertex</p>
      </div>

      <div className="doc-sections">
        {sections.map(section => (
          <div key={section.id} className="doc-section">
            <button 
              className="doc-section-header"
              onClick={() => toggleSection(section.id)}
            >
              <span className="doc-section-icon">{section.icon}</span>
              <span className="doc-section-title">{section.title}</span>
              <span className="doc-section-toggle">
                {expandedSections.has(section.id) ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
              </span>
            </button>
            
            {expandedSections.has(section.id) && (
              <div className="doc-section-content">
                {section.content}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Icon components for table
function MoveIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2">
      <path d="M5 9l-3 3 3 3M9 5l3-3 3 3M19 9l3 3-3 3M9 19l3 3 3-3"/>
    </svg>
  );
}

function PowerIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
      <path d="M18.36 6.64a9 9 0 1 1-12.73 0M12 2v10"/>
    </svg>
  );
}

function ExternalIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/>
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
    </svg>
  );
}
