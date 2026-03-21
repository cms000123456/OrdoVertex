import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Filter,
  Plus,
  Bot,
  Database,
  FileText,
  Mail,
  Server,
  Shield,
  Webhook,
  ArrowRight,
  X,
  Sparkles,
  LayoutGrid,
  List
} from 'lucide-react';
import toast from 'react-hot-toast';
import { templatesApi } from '../services/api';
import './TemplatesGallery.css';

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
}

const categoryIcons: Record<string, React.ReactNode> = {
  'AI': <Bot size={20} />,
  'Data': <Database size={20} />,
  'Database': <Database size={20} />,
  'Integration': <Webhook size={20} />,
  'Notification': <Mail size={20} />,
  'File': <FileText size={20} />,
  'Authentication': <Shield size={20} />,
  'Demo': <Sparkles size={20} />,
  'Tutorial': <LayoutGrid size={20} />,
  'Default': <Server size={20} />
};

const categoryColors: Record<string, string> = {
  'AI': '#8b5cf6',
  'Data': '#10b981',
  'Database': '#3b82f6',
  'Integration': '#f59e0b',
  'Notification': '#ef4444',
  'File': '#06b6d4',
  'Authentication': '#6366f1',
  'Demo': '#f59e0b',
  'Tutorial': '#10b981'
};

export function TemplatesGallery() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newWorkflowName, setNewWorkflowName] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    loadTemplates();
    loadCategories();
  }, []);

  const loadTemplates = async () => {
    try {
      const params: any = {};
      if (selectedCategory) params.category = selectedCategory;
      if (searchQuery) params.search = searchQuery;

      const response = await templatesApi.getAll(params);
      setTemplates(response.data.data || []);
    } catch (error) {
      toast.error('Failed to load templates');
    } finally {
      setIsLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await templatesApi.getCategories();
      setCategories(response.data.data || []);
    } catch (error) {
      console.error('Failed to load categories');
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      loadTemplates();
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery, selectedCategory]);

  const handleCreateFromTemplate = async () => {
    if (!selectedTemplate) return;

    try {
      const response = await templatesApi.createFromTemplate(selectedTemplate.id, {
        name: newWorkflowName || selectedTemplate.name
      });
      
      // Check if response has expected structure
      if (!response.data?.success || !response.data?.data?.id) {
        console.error('Invalid response:', response.data);
        toast.error('Invalid response from server');
        return;
      }
      
      toast.success('Workflow created from template');
      setShowCreateModal(false);
      navigate(`/workflows/${response.data.data.id}`);
    } catch (error: any) {
      console.error('Create from template error:', error);
      const message = error.response?.data?.error || 'Failed to create workflow';
      toast.error(message);
    }
  };

  const openCreateModal = (template: Template) => {
    setSelectedTemplate(template);
    setNewWorkflowName(template.name);
    setShowCreateModal(true);
  };

  if (isLoading) {
    return (
      <div className="templates-gallery loading">
        <div className="spinner"></div>
        <p>Loading templates...</p>
      </div>
    );
  }

  return (
    <div className="templates-gallery">
      <div className="templates-header">
        <div className="header-title">
          <Sparkles size={28} className="sparkle-icon" />
          <div>
            <h1>Workflow Templates</h1>
            <p>Start quickly with pre-built workflow templates</p>
          </div>
        </div>

        <div className="view-toggle">
          <button
            className={viewMode === 'grid' ? 'active' : ''}
            onClick={() => setViewMode('grid')}
          >
            <LayoutGrid size={18} />
          </button>
          <button
            className={viewMode === 'list' ? 'active' : ''}
            onClick={() => setViewMode('list')}
          >
            <List size={18} />
          </button>
        </div>
      </div>

      <div className="templates-filters">
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="category-filters">
          <button
            className={!selectedCategory ? 'active' : ''}
            onClick={() => setSelectedCategory('')}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              className={selectedCategory === cat ? 'active' : ''}
              onClick={() => setSelectedCategory(cat)}
              style={{
                '--category-color': categoryColors[cat] || '#6366f1'
              } as React.CSSProperties}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {templates.length === 0 ? (
        <div className="templates-empty">
          <Filter size={48} />
          <h3>No templates found</h3>
          <p>Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className={`templates-${viewMode}`}>
          {templates.map((template) => (
            <div key={template.id} className="template-card">
              <div
                className="template-icon"
                style={{
                  background: `linear-gradient(135deg, ${categoryColors[template.category] || '#6366f1'}20, ${categoryColors[template.category] || '#6366f1'}40)`,
                  color: categoryColors[template.category] || '#6366f1'
                }}
              >
                {categoryIcons[template.category] || categoryIcons['Default']}
              </div>

              <div className="template-content">
                <div className="template-header">
                  <h3>{template.name}</h3>
                  <span
                    className="category-badge"
                    style={{
                      background: categoryColors[template.category] || '#6366f1',
                      color: 'white'
                    }}
                  >
                    {template.category}
                  </span>
                </div>

                <p className="template-description">{template.description}</p>

                <div className="template-tags">
                  {template.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="tag">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <button
                className="btn-use-template"
                onClick={() => openCreateModal(template)}
              >
                <Plus size={16} />
                Use Template
                <ArrowRight size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && selectedTemplate && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create Workflow from Template</h2>
              <button className="close-btn" onClick={() => setShowCreateModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="template-preview">
              <div
                className="preview-icon"
                style={{
                  background: `linear-gradient(135deg, ${categoryColors[selectedTemplate.category] || '#6366f1'}20, ${categoryColors[selectedTemplate.category] || '#6366f1'}40)`,
                  color: categoryColors[selectedTemplate.category] || '#6366f1'
                }}
              >
                {categoryIcons[selectedTemplate.category] || categoryIcons['Default']}
              </div>
              <div>
                <h3>{selectedTemplate.name}</h3>
                <p>{selectedTemplate.description}</p>
              </div>
            </div>

            <div className="form-group">
              <label>Workflow Name</label>
              <input
                type="text"
                value={newWorkflowName}
                onChange={(e) => setNewWorkflowName(e.target.value)}
                placeholder="Enter workflow name..."
                autoFocus
              />
            </div>

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleCreateFromTemplate}
                disabled={!newWorkflowName.trim()}
              >
                <Plus size={16} />
                Create Workflow
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
