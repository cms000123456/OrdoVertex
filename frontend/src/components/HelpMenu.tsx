import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { HelpCircle, BookOpen, Keyboard, ChevronDown, ExternalLink } from 'lucide-react';
import './HelpMenu.css';

export function HelpMenu() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="help-menu">
      <button
        className="help-menu-trigger"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
      >
        <HelpCircle size={18} />
        <span>Help</span>
        <ChevronDown
          size={16}
          className={`chevron ${isExpanded ? 'expanded' : ''}`}
        />
      </button>

      {isExpanded && (
        <div className="help-menu-dropdown">
          <NavLink
            to="/help"
            className={({ isActive }) =>
              `help-menu-item ${isActive ? 'active' : ''}`
            }
            onClick={() => setIsExpanded(false)}
          >
            <BookOpen size={16} />
            <span>Documentation</span>
          </NavLink>

          <NavLink
            to="/help?section=shortcuts"
            className={({ isActive }) =>
              `help-menu-item ${isActive ? 'active' : ''}`
            }
            onClick={() => setIsExpanded(false)}
          >
            <Keyboard size={16} />
            <span>Keyboard Shortcuts</span>
          </NavLink>

          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="help-menu-item external"
            onClick={() => setIsExpanded(false)}
          >
            <ExternalLink size={16} />
            <span>GitHub</span>
          </a>
        </div>
      )}
    </div>
  );
}
