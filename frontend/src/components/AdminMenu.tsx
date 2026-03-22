import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Shield, Users, Settings, ChevronDown, Workflow, Key, Lock, Terminal, UsersRound, Activity, Building2, BookOpen } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import './AdminMenu.css';

export function AdminMenu() {
  const isAdmin = useAuthStore((state) => state.isAdmin);
  const [isExpanded, setIsExpanded] = useState(false);

  // Only render if user is admin
  if (!isAdmin) {
    return null;
  }

  return (
    <div className="admin-menu">
      <button
        className="admin-menu-trigger"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
      >
        <Shield size={18} className="admin-icon" />
        <span>Admin</span>
        <ChevronDown
          size={16}
          className={`chevron ${isExpanded ? 'expanded' : ''}`}
        />
      </button>

      {isExpanded && (
        <div className="admin-menu-dropdown">
          <NavLink
            to="/admin/users"
            className={({ isActive }) =>
              `admin-menu-item ${isActive ? 'active' : ''}`
            }
            onClick={() => setIsExpanded(false)}
          >
            <Users size={16} />
            <span>User Management</span>
          </NavLink>

          <NavLink
            to="/admin/workspaces"
            className={({ isActive }) =>
              `admin-menu-item ${isActive ? 'active' : ''}`
            }
            onClick={() => setIsExpanded(false)}
          >
            <Building2 size={16} />
            <span>Workspaces</span>
          </NavLink>

          <NavLink
            to="/admin/groups"
            className={({ isActive }) =>
              `admin-menu-item ${isActive ? 'active' : ''}`
            }
            onClick={() => setIsExpanded(false)}
          >
            <UsersRound size={16} />
            <span>Groups & Teams</span>
          </NavLink>

          <NavLink
            to="/admin/workflows"
            className={({ isActive }) =>
              `admin-menu-item ${isActive ? 'active' : ''}`
            }
            onClick={() => setIsExpanded(false)}
          >
            <Workflow size={16} />
            <span>All Workflows</span>
          </NavLink>

          <NavLink
            to="/admin/api-keys"
            className={({ isActive }) =>
              `admin-menu-item ${isActive ? 'active' : ''}`
            }
            onClick={() => setIsExpanded(false)}
          >
            <Key size={16} />
            <span>API Keys</span>
          </NavLink>

          <NavLink
            to="/admin/saml"
            className={({ isActive }) =>
              `admin-menu-item ${isActive ? 'active' : ''}`
            }
            onClick={() => setIsExpanded(false)}
          >
            <Lock size={16} />
            <span>SAML SSO</span>
          </NavLink>

          <NavLink
            to="/admin/execution-logs"
            className={({ isActive }) =>
              `admin-menu-item ${isActive ? 'active' : ''}`
            }
            onClick={() => setIsExpanded(false)}
          >
            <Terminal size={16} />
            <span>Execution Logs</span>
          </NavLink>

          <NavLink
            to="/admin/performance"
            className={({ isActive }) =>
              `admin-menu-item ${isActive ? 'active' : ''}`
            }
            onClick={() => setIsExpanded(false)}
          >
            <Activity size={16} />
            <span>Performance</span>
          </NavLink>

          <NavLink
            to="/admin/documentation"
            className={({ isActive }) =>
              `admin-menu-item ${isActive ? 'active' : ''}`
            }
            onClick={() => setIsExpanded(false)}
          >
            <BookOpen size={16} />
            <span>Documentation</span>
          </NavLink>

          <NavLink
            to="/admin/settings"
            className={({ isActive }) =>
              `admin-menu-item ${isActive ? 'active' : ''}`
            }
            onClick={() => setIsExpanded(false)}
          >
            <Settings size={16} />
            <span>System Settings</span>
          </NavLink>
        </div>
      )}
    </div>
  );
}
