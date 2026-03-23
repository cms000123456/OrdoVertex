import React, { useState, useEffect, useCallback } from 'react';
import { X, ExternalLink, Database, PlayCircle, Settings, Lightbulb, XCircle, RefreshCw, Image } from 'lucide-react';
import { useWorkflowStore } from '../store/workflowStore';
import { credentialApi, executionsApi } from '../services/api';
import { Credential } from '../types';
import { AITips } from './AITips';
import { CodeEditor } from './CodeEditor';

// Check if a string is an image URL
const isImageUrl = (url: string): boolean => {
  if (typeof url !== 'string') return false;
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];
  const lowerUrl = url.toLowerCase();
  return imageExtensions.some(ext => lowerUrl.includes(ext)) || 
         lowerUrl.includes('cataas.com/cat') ||
         lowerUrl.includes('dog.ceo/api') ||
         lowerUrl.includes('picsum.photos');
};

// Render JSON data with image support
const RenderJsonData: React.FC<{ data: any }> = ({ data }) => {
  console.log('RenderJsonData raw:', typeof data, data);
  
  // Parse if data is a string (JSON string from API)
  let parsedData = data;
  if (typeof data === 'string') {
    try {
      parsedData = JSON.parse(data);
      console.log('Parsed string data:', parsedData);
    } catch (e) {
      console.log('Failed to parse, rendering as text');
      return <pre className="data-json">{data}</pre>;
    }
  }
  
  // Handle array of items (unwrap first item)
  let displayData = parsedData;
  if (Array.isArray(parsedData) && parsedData.length > 0) {
    displayData = parsedData[0]?.json || parsedData[0];
    console.log('Unwrapped array data:', displayData);
  }
  
  console.log('Checking _display:', displayData?._display);
  
  // Check for _display hint (from Image Display node)
  if (displayData?._display?.type === 'image' && displayData._display.url) {
    console.log('Rendering image:', displayData._display.url);
    return (
      <div className="image-display">
        <img 
          src={displayData._display.url} 
          alt={displayData._display.alt || 'Image'}
          style={{ maxWidth: displayData._display.maxWidth || '350px', borderRadius: '8px', width: '100%' }}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
        {displayData._display.caption && (
          <p className="image-caption">{displayData._display.caption}</p>
        )}
        <details>
          <summary>View raw data</summary>
          <pre className="data-json">{JSON.stringify(data, null, 2)}</pre>
        </details>
      </div>
    );
  }

  // Check for imageUrl field in data
  if (displayData?.imageUrl && isImageUrl(displayData.imageUrl)) {
    return (
      <div className="image-display">
        <img 
          src={displayData.imageUrl} 
          alt={displayData.altText || displayData.breed || 'Image'}
          style={{ maxWidth: displayData.maxWidth || '350px', borderRadius: '8px', width: '100%' }}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
        {displayData.caption && <p className="image-caption">{displayData.caption}</p>}
        <details>
          <summary>View raw data</summary>
          <pre className="data-json">{JSON.stringify(data, null, 2)}</pre>
        </details>
      </div>
    );
  }

  // Default: render as JSON
  return <pre className="data-json">{JSON.stringify(data, null, 2)}</pre>;
};

interface NodeConfigPanelProps {
  nodeId: string;
  onParameterChange: (key: string, value: any) => void;
}

interface NodeExecutionData {
  id: string;
  nodeId: string;
  nodeName: string;
  status: string;
  input: any;
  output: any;
  error: string | null;
  startedAt: string;
  finishedAt: string;
  duration: number | null;
}

export function NodeConfigPanel({ nodeId, onParameterChange }: NodeConfigPanelProps) {
  const node = useWorkflowStore((state) => state.getNodeById(nodeId));
  const nodeType = useWorkflowStore((state) => state.getNodeType(node?.type || ''));
  const setSelectedNode = useWorkflowStore((state) => state.setSelectedNode);
  const currentWorkflow = useWorkflowStore((state) => state.currentWorkflow);
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [credentialsLoading, setCredentialsLoading] = useState(false);
  
  // Execution data state
  const [activeTab, setActiveTab] = useState<'config' | 'input' | 'output'>('config');
  const [executionData, setExecutionData] = useState<NodeExecutionData | null>(null);
  const [executionLoading, setExecutionLoading] = useState(false);
  const [executionError, setExecutionError] = useState<string | null>(null);
  
  // Help tip state (show initially)
  const [showTip, setShowTip] = useState(() => {
    return !localStorage.getItem('nodeInspectorTipDismissed');
  });
  
  const dismissTip = () => {
    localStorage.setItem('nodeInspectorTipDismissed', 'true');
    setShowTip(false);
  };

  // Load credentials when needed
  const loadCredentials = useCallback(async (type?: string) => {
    try {
      setCredentialsLoading(true);
      const response = await credentialApi.list(type);
      // Handle both response formats
      const creds = response.data.credentials || response.data.data?.credentials || [];
      setCredentials(creds);
    } catch (err) {
      console.error('Failed to load credentials:', err);
    } finally {
      setCredentialsLoading(false);
    }
  }, []);

  // Load execution data
  const loadExecutionData = useCallback(async () => {
    if (!currentWorkflow || !node) return;
    
    try {
      setExecutionLoading(true);
      setExecutionError(null);
      
      // First get recent executions
      const executionsRes = await executionsApi.getAll();
      console.log('Executions API response:', executionsRes.data);
      
      // Handle different response structures
      const executions = executionsRes.data?.executions || executionsRes.data?.data?.executions || [];
      console.log('Found executions:', executions.length);
      
      // Find the most recent completed execution for this workflow
      const recentExecution = executions.find((e: any) => 
        e.workflowId === currentWorkflow.id && 
        (e.status === 'success' || e.status === 'failed')
      );
      
      if (!recentExecution) {
        console.log('No recent execution found for workflow', currentWorkflow.id);
        setExecutionData(null);
        return;
      }
      
      console.log('Found execution:', recentExecution.id, 'Looking for node:', node.id);
      
      // Get node execution data
      const nodeExecRes = await executionsApi.getNodeExecution(recentExecution.id, node.id);
      console.log('Node execution raw response:', nodeExecRes.data);
      
      // Handle different response structures
      const nodeExecution = nodeExecRes.data?.nodeExecution || nodeExecRes.data?.data?.nodeExecution || nodeExecRes.data;
      console.log('Processed node execution:', nodeExecution);
      setExecutionData(nodeExecution);
    } catch (err: any) {
      console.error('Error loading execution data:', err);
      if (err.response?.status === 404) {
        console.log('Node execution not found for node:', node.id);
        setExecutionData(null);
      } else {
        setExecutionError('Failed to load execution data: ' + (err.message || 'Unknown error'));
      }
    } finally {
      setExecutionLoading(false);
    }
  }, [currentWorkflow, node]);
  
  // Load execution data when tab changes or node selected
  useEffect(() => {
    if (activeTab === 'input' || activeTab === 'output') {
      loadExecutionData();
    }
  }, [activeTab, loadExecutionData]);

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
      ([key, values]: [string, any]) => {
        // Get the actual value, considering the parameter might not be set yet (use default)
        const paramValue = node.parameters[key] ?? nodeType?.properties?.find((p: any) => p.name === key)?.default;
        return values.includes(paramValue);
      }
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
      case 'json': {
        // Determine if this is a code field that should use the code editor
        const isCodeField = node.type === 'code' && 
          (property.name === 'code' || property.name === 'pythonCode');
        
        // Determine language for syntax highlighting
        let codeLanguage: 'javascript' | 'python' | 'json' | 'plaintext' = 'plaintext';
        if (property.type === 'json') {
          codeLanguage = 'json';
        } else if (node.type === 'code') {
          const languageParam = node.parameters['language'] || 'javascript';
          codeLanguage = property.name === 'pythonCode' || languageParam === 'python' 
            ? 'python' 
            : 'javascript';
        }
        
        // Use CodeEditor for code fields, otherwise use textarea
        if (isCodeField) {
          return (
            <CodeEditor
              value={typeof value === 'object' ? JSON.stringify(value, null, 2) : value || ''}
              onChange={(newValue) => onParameterChange(property.name, newValue)}
              language={codeLanguage}
              placeholder={property.placeholder}
              rows={12}
            />
          );
        }
        
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
      }

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

  const renderDataView = (data: any, title: string) => {
    if (executionLoading) {
      return (
        <div className="data-loading">
          <div className="spinner-small"></div>
          <span>Loading execution data...</span>
        </div>
      );
    }
    
    if (executionError) {
      return (
        <div className="data-error">
          <p>{executionError}</p>
        </div>
      );
    }
    
    if (!executionData) {
      return (
        <div className="data-empty">
          <p>No execution data available for this node.</p>
          <p className="data-hint">
            Run the workflow first, then check back here.
            <br />
            Make sure you're viewing the most recent execution.
          </p>
        </div>
      );
    }
    
    const displayData = title === 'Input' ? executionData.input : executionData.output;
    
    if (!displayData || (Array.isArray(displayData) && displayData.length === 0)) {
      return (
        <div className="data-empty">
          <p>No {title.toLowerCase()} data for this execution.</p>
        </div>
      );
    }
    
    return (
      <div className="data-content">
        <div className="data-header">
          <span className="data-status" data-status={executionData.status}>
            {executionData.status}
          </span>
          {executionData.duration && (
            <span className="data-duration">{executionData.duration}ms</span>
          )}
        </div>
        <RenderJsonData data={displayData} />
      </div>
    );
  };

  return (
    <div className="config-panel">
      <div className="config-header">
        <h3>Node Inspector</h3>
        <button
          className="close-btn"
          onClick={() => setSelectedNode(null)}
        >
          <X size={18} />
        </button>
      </div>

      {/* Tabs */}
      <div className="inspector-tabs">
        <button
          className={`tab ${activeTab === 'config' ? 'active' : ''}`}
          onClick={() => setActiveTab('config')}
        >
          <Settings size={14} />
          <span>Config</span>
        </button>
        <button
          className={`tab ${activeTab === 'input' ? 'active' : ''}`}
          onClick={() => setActiveTab('input')}
        >
          <PlayCircle size={14} />
          <span>Input</span>
        </button>
        <button
          className={`tab ${activeTab === 'output' ? 'active' : ''}`}
          onClick={() => setActiveTab('output')}
        >
          <Database size={14} />
          <span>Output</span>
        </button>
      </div>

      <div className="config-content">
        {/* Config Tab */}
        {activeTab === 'config' && (
          <>
            {showTip && (
              <div className="inspector-tip">
                <Lightbulb size={16} className="tip-icon" />
                <div className="tip-content">
                  <strong>New to OrdoVertex?</strong>
                  <p>
                    Use the <strong>Input</strong> and <strong>Output</strong> tabs to see how data flows between nodes. 
                    Run a workflow first, then click on any node to inspect its data!
                  </p>
                </div>
                <button className="tip-close" onClick={dismissTip} title="Dismiss tip">
                  <XCircle size={16} />
                </button>
              </div>
            )}
            
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
          </>
        )}
        
        {/* Input Tab */}
        {activeTab === 'input' && (
          <div className="data-tab">
            <div className="tab-header">
              <div>
                <h4>Input Data</h4>
                <p className="tab-description">
                  Data that flowed into this node from the previous node.
                </p>
              </div>
              <button 
                className="refresh-btn" 
                onClick={loadExecutionData}
                disabled={executionLoading}
                title="Refresh data"
              >
                <RefreshCw size={16} className={executionLoading ? 'spinning' : ''} />
              </button>
            </div>
            {renderDataView(executionData?.input, 'Input')}
          </div>
        )}
        
        {/* Output Tab */}
        {activeTab === 'output' && (
          <div className="data-tab">
            <div className="tab-header">
              <div>
                <h4>Output Data</h4>
                <p className="tab-description">
                  Data that flowed out of this node to the next node.
                </p>
              </div>
              <button 
                className="refresh-btn" 
                onClick={loadExecutionData}
                disabled={executionLoading}
                title="Refresh data"
              >
                <RefreshCw size={16} className={executionLoading ? 'spinning' : ''} />
              </button>
            </div>
            {renderDataView(executionData?.output, 'Output')}
          </div>
        )}
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
        
        .inspector-tabs {
          display: flex;
          border-bottom: 1px solid var(--border-color, #e2e8f0);
          background: var(--bg-secondary, #f8fafc);
        }
        
        .tab {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 12px;
          border: none;
          background: transparent;
          color: var(--text-secondary, #64748b);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          border-bottom: 2px solid transparent;
        }
        
        .tab:hover {
          color: var(--text-primary, #1e293b);
          background: rgba(99, 102, 241, 0.05);
        }
        
        .tab.active {
          color: var(--primary, #6366f1);
          border-bottom-color: var(--primary, #6366f1);
          background: white;
        }
        
        .data-tab {
          padding: 16px;
        }
        
        .data-tab h4 {
          margin: 0 0 8px 0;
          font-size: 14px;
          color: var(--text-primary, #1e293b);
        }
        
        .tab-description {
          margin: 0 0 16px 0;
          font-size: 12px;
          color: var(--text-secondary, #64748b);
        }
        
        .data-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 40px;
          color: var(--text-secondary, #64748b);
        }
        
        .spinner-small {
          width: 20px;
          height: 20px;
          border: 2px solid #e2e8f0;
          border-top-color: #6366f1;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        .data-error {
          padding: 24px;
          text-align: center;
          color: #ef4444;
          background: #fef2f2;
          border-radius: 8px;
        }
        
        .data-empty {
          padding: 40px 24px;
          text-align: center;
          color: var(--text-secondary, #64748b);
        }
        
        .data-empty p {
          margin: 0 0 8px 0;
        }
        
        .data-hint {
          font-size: 12px;
          opacity: 0.8;
        }
        
        .data-content {
          background: var(--bg-secondary, #f8fafc);
          border-radius: 8px;
          overflow: hidden;
        }
        
        .data-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          background: var(--bg-tertiary, #f1f5f9);
          border-bottom: 1px solid var(--border-color, #e2e8f0);
        }
        
        .data-status {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          padding: 4px 8px;
          border-radius: 4px;
        }
        
        .data-status[data-status="success"] {
          background: #dcfce7;
          color: #166534;
        }
        
        .data-status[data-status="failed"] {
          background: #fee2e2;
          color: #991b1b;
        }
        
        .data-status[data-status="running"] {
          background: #dbeafe;
          color: #1e40af;
        }
        
        .data-duration {
          font-size: 12px;
          color: var(--text-secondary, #64748b);
          font-family: monospace;
        }
        
        .data-json {
          margin: 0;
          padding: 16px;
          font-size: 12px;
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          line-height: 1.5;
          color: #1e293b;
          background: #f1f5f9;
          overflow-x: auto;
          white-space: pre-wrap;
          word-break: break-word;
          max-height: 400px;
          overflow-y: auto;
          border-radius: 6px;
        }
        
        .tab-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 12px;
        }
        
        .refresh-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border: 1px solid var(--border-color, #e2e8f0);
          border-radius: 6px;
          background: white;
          color: var(--text-secondary, #64748b);
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .refresh-btn:hover:not(:disabled) {
          background: var(--bg-secondary, #f8fafc);
          color: var(--primary, #6366f1);
          border-color: var(--primary, #6366f1);
        }
        
        .refresh-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .spinning {
          animation: spin 1s linear infinite;
        }
        
        .inspector-tip {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 12px 14px;
          margin: 12px 16px;
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
          border: 1px solid #fbbf24;
          border-radius: 10px;
          font-size: 12px;
          color: #92400e;
        }
        
        .tip-icon {
          flex-shrink: 0;
          color: #f59e0b;
          margin-top: 1px;
        }
        
        .tip-content {
          flex: 1;
        }
        
        .tip-content strong {
          display: block;
          margin-bottom: 4px;
          color: #78350f;
        }
        
        .tip-content p {
          margin: 0;
          line-height: 1.5;
        }
        
        .tip-close {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2px;
          border: none;
          background: transparent;
          color: #92400e;
          cursor: pointer;
          border-radius: 4px;
          opacity: 0.7;
          transition: all 0.2s;
        }
        
        .tip-close:hover {
          opacity: 1;
          background: rgba(146, 64, 14, 0.1);
        }
        
        /* Image Display Styles */
        .image-display {
          padding: 16px;
          text-align: center;
        }
        
        .image-display img {
          max-width: 100%;
          height: auto;
          border-radius: 8px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        
        .image-caption {
          font-size: 13px;
          color: #334155;
          margin: 12px 0 0 0;
          font-style: italic;
          padding: 0 8px;
        }
        
        .image-display details {
          margin-top: 16px;
          text-align: left;
        }
        
        .image-display summary {
          font-size: 12px;
          color: var(--primary, #6366f1);
          cursor: pointer;
          user-select: none;
          padding: 8px 0;
        }
        
        .image-display summary:hover {
          color: #4f46e5;
        }
      `}</style>
    </div>
  );
}

export default NodeConfigPanel;
