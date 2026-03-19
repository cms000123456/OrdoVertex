import React, { useEffect, useState } from 'react';
import { Play, CheckCircle, XCircle, Clock, ChevronDown, ChevronRight, Database, X } from 'lucide-react';
import { executionsApi } from '../services/api';
import { Execution } from '../types';
import './ExecutionResults.css';

interface ExecutionResultsProps {
  workflowId: string;
  onClose: () => void;
}

interface NodeExecution {
  id: string;
  nodeId: string;
  nodeName: string;
  status: 'running' | 'success' | 'failed';
  startedAt: string;
  finishedAt?: string;
  input?: any;
  output?: any;
  error?: string;
}

export function ExecutionResults({ workflowId, onClose }: ExecutionResultsProps) {
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [selectedExecution, setSelectedExecution] = useState<Execution | null>(null);
  const [nodeExecutions, setNodeExecutions] = useState<NodeExecution[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  useEffect(() => {
    loadExecutions();
    // Poll for new executions every 3 seconds
    const interval = setInterval(loadExecutions, 3000);
    return () => clearInterval(interval);
  }, [workflowId]);

  const loadExecutions = async () => {
    try {
      const response = await executionsApi.getAll();
      // Filter executions for this workflow
      const workflowExecutions = response.data.data.executions.filter(
        (e: Execution) => e.workflowId === workflowId
      );
      setExecutions(workflowExecutions);
      
      // If we have a selected execution, refresh its details
      if (selectedExecution) {
        const updated = workflowExecutions.find((e: Execution) => e.id === selectedExecution.id);
        if (updated && updated.status !== selectedExecution.status) {
          loadExecutionDetails(updated.id);
        }
      }
    } catch (error) {
      console.error('Failed to load executions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadExecutionDetails = async (executionId: string) => {
    setIsLoadingDetails(true);
    try {
      const response = await executionsApi.getById(executionId);
      setSelectedExecution(response.data.data);
      setNodeExecutions(response.data.data.nodeExecutions || []);
    } catch (error) {
      console.error('Failed to load execution details:', error);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const toggleNodeExpansion = (nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const formatDuration = (startedAt: string, finishedAt?: string) => {
    if (!finishedAt) return 'Running...';
    const start = new Date(startedAt).getTime();
    const end = new Date(finishedAt).getTime();
    const duration = end - start;
    if (duration < 1000) return `${duration}ms`;
    return `${(duration / 1000).toFixed(2)}s`;
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle size={16} className="status-icon success" />;
      case 'failed':
        return <XCircle size={16} className="status-icon error" />;
      case 'running':
        return <Clock size={16} className="status-icon running" />;
      default:
        return <Play size={16} className="status-icon" />;
    }
  };

  return (
    <div className="execution-results-panel">
      <div className="panel-header">
        <div className="panel-title">
          <Database size={18} />
          <span>Execution Results</span>
        </div>
        <button className="close-btn" onClick={onClose}>
          <X size={18} />
        </button>
      </div>

      <div className="panel-content">
        {isLoading ? (
          <div className="loading-state">Loading executions...</div>
        ) : executions.length === 0 ? (
          <div className="empty-state">
            <Play size={32} />
            <p>No executions yet</p>
            <span>Run your workflow to see results</span>
          </div>
        ) : (
          <>
            <div className="executions-list">
              <h4>Recent Executions</h4>
              {executions.map((execution) => (
                <button
                  key={execution.id}
                  className={`execution-item ${selectedExecution?.id === execution.id ? 'selected' : ''} ${execution.status}`}
                  onClick={() => loadExecutionDetails(execution.id)}
                >
                  {getStatusIcon(execution.status)}
                  <div className="execution-info">
                    <span className="execution-time">{formatTime(execution.startedAt)}</span>
                    <span className="execution-duration">
                      {formatDuration(execution.startedAt, execution.finishedAt)}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {selectedExecution && (
              <div className="execution-details">
                <div className="details-header">
                  <h4>Node Outputs</h4>
                  {isLoadingDetails && <span className="loading-text">Loading...</span>}
                </div>

                {nodeExecutions.length === 0 ? (
                  <div className="no-nodes">No node data available</div>
                ) : (
                  <div className="node-executions">
                    {nodeExecutions.map((nodeExec) => (
                      <div key={nodeExec.id} className={`node-execution ${nodeExec.status}`}>
                        <button
                          className="node-header"
                          onClick={() => toggleNodeExpansion(nodeExec.id)}
                        >
                          {expandedNodes.has(nodeExec.id) ? (
                            <ChevronDown size={16} />
                          ) : (
                            <ChevronRight size={16} />
                          )}
                          {getStatusIcon(nodeExec.status)}
                          <span className="node-name">{nodeExec.nodeName}</span>
                          <span className="node-duration">
                            {formatDuration(nodeExec.startedAt, nodeExec.finishedAt)}
                          </span>
                        </button>

                        {expandedNodes.has(nodeExec.id) && (
                          <div className="node-details">
                            {nodeExec.error ? (
                              <div className="error-section">
                                <h5>Error</h5>
                                <pre className="error-message">{nodeExec.error}</pre>
                              </div>
                            ) : (
                              <>
                                {nodeExec.input && (
                                  <div className="data-section">
                                    <h5>Input</h5>
                                    <pre className="json-data">
                                      {JSON.stringify(nodeExec.input, null, 2)}
                                    </pre>
                                  </div>
                                )}
                                {nodeExec.output && (
                                  <div className="data-section">
                                    <h5>Output</h5>
                                    <pre className="json-data">
                                      {JSON.stringify(nodeExec.output, null, 2)}
                                    </pre>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
