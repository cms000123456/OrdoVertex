import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Workflow, ChevronDown, Search, Check } from 'lucide-react';
import { workflowsApi } from '../services/api';
import { Workflow as WorkflowType } from '../types';
import toast from 'react-hot-toast';
import './WorkflowSelector.css';

interface WorkflowSelectorProps {
  currentWorkflowId?: string;
}

export function WorkflowSelector({ currentWorkflowId }: WorkflowSelectorProps) {
  const navigate = useNavigate();
  const [workflows, setWorkflows] = useState<WorkflowType[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const currentWorkflow = workflows.find((w) => w.id === currentWorkflowId);

  useEffect(() => {
    loadWorkflows();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const loadWorkflows = async () => {
    setIsLoading(true);
    try {
      const response = await workflowsApi.getAll();
      setWorkflows(response.data.data?.workflows || response.data.data || []);
    } catch (error) {
      toast.error('Failed to load workflows');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = (workflowId: string) => {
    setIsOpen(false);
    setSearchTerm('');
    if (workflowId !== currentWorkflowId) {
      navigate(`/workflows/${workflowId}`);
    }
  };

  const filteredWorkflows = workflows.filter((workflow) =>
    workflow.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="workflow-selector" ref={dropdownRef}>
      <button
        className="workflow-selector-trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <Workflow size={18} className="workflow-icon" />
        <span className="workflow-name">
          {currentWorkflow?.name || 'Select Workflow'}
        </span>
        <ChevronDown
          size={16}
          className={`chevron ${isOpen ? 'expanded' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="workflow-selector-dropdown">
          <div className="workflow-selector-search">
            <Search size={16} className="search-icon" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search workflows..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="workflow-selector-list">
            {isLoading ? (
              <div className="workflow-selector-loading">
                <div className="spinner-small"></div>
                <span>Loading...</span>
              </div>
            ) : filteredWorkflows.length === 0 ? (
              <div className="workflow-selector-empty">
                {searchTerm
                  ? 'No workflows found'
                  : 'No workflows available'}
              </div>
            ) : (
              filteredWorkflows.map((workflow) => (
                <button
                  key={workflow.id}
                  className={`workflow-option ${
                    workflow.id === currentWorkflowId ? 'selected' : ''
                  }`}
                  onClick={() => handleSelect(workflow.id)}
                >
                  <div className="workflow-option-info">
                    <span className="workflow-option-name">
                      {workflow.name}
                    </span>
                    {workflow.description && (
                      <span className="workflow-option-description">
                        {workflow.description}
                      </span>
                    )}
                  </div>
                  {workflow.id === currentWorkflowId && (
                    <Check size={16} className="check-icon" />
                  )}
                  <span
                    className={`workflow-status ${
                      workflow.active ? 'active' : 'inactive'
                    }`}
                  >
                    {workflow.active ? 'Active' : 'Inactive'}
                  </span>
                </button>
              ))
            )}
          </div>

          <div className="workflow-selector-footer">
            <span>{workflows.length} workflow(s)</span>
          </div>
        </div>
      )}
    </div>
  );
}
