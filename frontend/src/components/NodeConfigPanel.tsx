import React, { useState, useEffect, useCallback } from 'react';
import { X, ExternalLink } from 'lucide-react';
import { useWorkflowStore } from '../store/workflowStore';
import { credentialApi } from '../services/api';
import { Credential } from '../types';
import { AITips } from './AITips';

interface NodeConfigPanelProps {
  nodeId: string;
  onParameterChange: (key: string, value: any) => void;
}

export function NodeConfigPanel({ nodeId, onParameterChange }: NodeConfigPanelProps) {
  const node = useWorkflowStore((state) => state.getNodeById(nodeId));
  const nodeType = useWorkflowStore((state) => state.getNodeType(node?.type || ''));
  const setSelectedNode = useWorkflowStore((state) => state.setSelectedNode);
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [credentialsLoading, setCredentialsLoading] = useState(false);

  // Load credentials when needed
  const loadCredentials = useCallback(async (type?: string) => {
    try {
      setCredentialsLoading(true);
      const response = await credentialApi.list(type);
      setCredentials(response.data.credentials);
    } catch (err) {
      console.error('Failed to load credentials:', err);
    } finally {
      setCredentialsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Check if any property needs credentials
    const needsCredentials = nodeType?.properties?.some(
      (p: any) => p.type === 'resource' && p.resourceType === 'credential'
    );
    if (needsCredentials) {
      loadCredentials();
    }
  }, [nodeType, loadCredentials]);

  if (!node || !nodeType) return null;

  const shouldShowProperty = (property: any) => {
    if (!property.displayOptions?.show) return true;
    
    return Object.entries(property.displayOptions.show).every(
      ([key, values]: [string, any]) => values.includes(node.parameters[key])
    );
  };

  const renderPropertyInput = (property: any) => {
    const value = node.parameters[property.name] ?? property.default;

    switch (property.type) {
      case 'string':
        return (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => onParameterChange(property.name, e.target.value)}
            placeholder={property.placeholder}
            className="form-input"
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={value || 0}
            onChange={(e) => onParameterChange(property.name, parseFloat(e.target.value))}
            className="form-input"
          />
        );

      case 'boolean':
        return (
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={value || false}
              onChange={(e) => onParameterChange(property.name, e.target.checked)}
            />
            <span className="checkbox-text">{property.description}</span>
          </label>
        );

      case 'options':
        return (
          <select
            value={value || property.default}
            onChange={(e) => onParameterChange(property.name, e.target.value)}
            className="form-select"
          >
            {property.options?.map((opt: any) => (
              <option key={opt.value} value={opt.value}>
                {opt.name}
              </option>
            ))}
          </select>
        );

      case 'resource':
        if (property.resourceType === 'credential') {
          return (
            <div className="credential-selector">
              <select
                value={value || ''}
                onChange={(e) => onParameterChange(property.name, e.target.value)}
                className="form-select"
                disabled={credentialsLoading}
              >
                <option value="">
                  {credentialsLoading ? 'Loading...' : 'Select a credential...'}
                </option>
                {(credentials || []).map((cred) => (
                  <option key={cred.id} value={cred.id}>
                    {cred.name} ({cred.type})
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={() => {
                  // Open credentials manager in new tab or trigger event
                  window.dispatchEvent(new CustomEvent('openCredentialsManager'));
                }}
                title="Manage Credentials"
              >
                <ExternalLink size={14} />
              </button>
            </div>
          );
        }
        return (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => onParameterChange(property.name, e.target.value)}
            className="form-input"
          />
        );

      case 'multiline':
      case 'json':
        return (
          <textarea
            value={typeof value === 'object' ? JSON.stringify(value, null, 2) : value || ''}
            onChange={(e) => {
              let val: any = e.target.value;
              if (property.type === 'json') {
                try {
                  val = JSON.parse(val);
                } catch {
                  // Keep as string if invalid JSON
                }
              }
              onParameterChange(property.name, val);
            }}
            placeholder={property.placeholder}
            className="form-textarea"
            rows={5}
          />
        );

      default:
        return (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => onParameterChange(property.name, e.target.value)}
            className="form-input"
          />
        );
    }
  };

  return (
    <div className="config-panel">
      <div className="config-header">
        <h3>Configuration</h3>
        <button
          className="close-btn"
          onClick={() => setSelectedNode(null)}
        >
          <X size={18} />
        </button>
      </div>

      <div className="config-content">
        <div className="node-info-header">
          <h4>{node.name}</h4>
          <span className="node-type-badge">{node.type}</span>
        </div>

        {/* Node Description */}
        <div className="property-row node-description-row">
          <label className="property-label">Description</label>
          <textarea
            value={node.description || ''}
            onChange={(e) => onParameterChange('__description', e.target.value)}
            placeholder="Add a description for this node (shown on canvas)..."
            className="form-textarea node-description-input"
            rows={2}
          />
        </div>

        {/* AI Tips for AI nodes */}
        {node.type === 'aiAgent' && <AITips context="agent" />}
        {node.type === 'aiEmbedding' && <AITips context="embedding" />}
        {node.type === 'aiVectorStore' && <AITips context="vector-store" />}
        {node.type === 'textSplitter' && <AITips context="text-splitter" />}

        <div className="properties-list">
          {nodeType.properties?.map((property) => {
            if (!shouldShowProperty(property)) return null;

            return (
              <div key={property.name} className="property-row">
                <label className="property-label">
                  {property.displayName}
                  {property.required && <span className="required">*</span>}
                </label>
                {renderPropertyInput(property)}
                {property.description && (
                  <p className="property-description">{property.description}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        .credential-selector {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .credential-selector .form-select {
          flex: 1;
        }

        .credential-selector .btn {
          padding: 6px 8px;
          flex-shrink: 0;
        }
      `}</style>
    </div>
  );
}
