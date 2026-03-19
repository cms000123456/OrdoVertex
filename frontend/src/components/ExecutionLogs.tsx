import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  Clock, 
  AlertCircle,
  CheckCircle,
  XCircle,
  Play,
  MoreHorizontal,
  ChevronDown,
  ChevronUp,
  Terminal
} from 'lucide-react';
import toast from 'react-hot-toast';
import { executionLogsApi } from '../services/api';
import './ExecutionLogs.css';

interface ExecutionLog {
  id: string;
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  nodeId?: string;
  nodeName?: string;
  message: string;
  details?: any;
  metadata?: any;
  execution?: {
    id: string;
    workflowId: string;
    status: string;
    startedAt: string;
  };
}

interface Execution {
  id: string;
  status: string;
  startedAt: string;
  finishedAt?: string;
  duration?: number;
  workflowId: string;
  workflow?: { name: string };
  _count?: { executionLogs?: number };
}

export function ExecutionLogs() {
  const [logs, setLogs] = useState<ExecutionLog[]>([]);
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedExecution, setSelectedExecution] = useState<string | null>(null);
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState({
    level: '',
    search: '',
    startDate: '',
    endDate: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0
  });

  useEffect(() => {
    loadStats();
    loadExecutions();
    loadLogs();
  }, [filters, pagination.page]);

  const loadStats = async () => {
    try {
      const response = await executionLogsApi.getStats();
      setStats(response.data.data);
    } catch (error) {
      console.error('Failed to load stats');
    }
  };

  const loadExecutions = async () => {
    try {
      const response = await executionLogsApi.getTimeline();
      setExecutions(response.data.data || []);
    } catch (error) {
      console.error('Failed to load executions');
    }
  };

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const params: any = {
        page: pagination.page,
        limit: pagination.limit
      };
      if (filters.level) params.level = filters.level;
      if (filters.search) params.search = filters.search;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      if (selectedExecution) params.executionId = selectedExecution;

      const response = await executionLogsApi.getAll(params);
      setLogs(response.data.data || []);
      if (response.data.pagination) {
        setPagination(prev => ({ ...prev, ...response.data.pagination }));
      }
    } catch (error) {
      toast.error('Failed to load logs');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async (executionId: string) => {
    try {
      const response = await executionLogsApi.export(executionId, 'csv');
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `execution-${executionId}-logs.csv`;
      a.click();
      toast.success('Logs exported');
    } catch (error) {
      toast.error('Failed to export logs');
    }
  };

  const toggleLogExpand = (logId: string) => {
    const newExpanded = new Set(expandedLogs);
    if (newExpanded.has(logId)) {
      newExpanded.delete(logId);
    } else {
      newExpanded.add(logId);
    }
    setExpandedLogs(newExpanded);
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'error': return <XCircle size={16} className="level-error" />;
      case 'warn': return <AlertCircle size={16} className="level-warn" />;
      case 'success': return <CheckCircle size={16} className="level-success" />;
      default: return <Terminal size={16} className="level-info" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle size={16} className="status-success" />;
      case 'failed': return <XCircle size={16} className="status-failed" />;
      case 'running': return <Play size={16} className="status-running" />;
      default: return <Clock size={16} className="status-pending" />;
    }
  };

  return (
    <div className="execution-logs">
      <div className="logs-header">
        <h1><Terminal size={24} /> Execution Logs</h1>
        
        {stats && (
          <div className="stats-cards">
            <div className="stat-card">
              <span className="stat-value">{stats.totalExecutions}</span>
              <span className="stat-label">Total Executions</span>
            </div>
            <div className="stat-card success">
              <span className="stat-value">{stats.statusBreakdown?.success || 0}</span>
              <span className="stat-label">Successful</span>
            </div>
            <div className="stat-card error">
              <span className="stat-value">{stats.statusBreakdown?.failed || 0}</span>
              <span className="stat-label">Failed</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{Math.round(stats.averageDuration || 0)}ms</span>
              <span className="stat-label">Avg Duration</span>
            </div>
          </div>
        )}
      </div>

      <div className="logs-layout">
        <div className="executions-sidebar">
          <h3>Recent Executions</h3>
          <div className="executions-list">
            <button 
              className={`execution-item ${!selectedExecution ? 'active' : ''}`}
              onClick={() => setSelectedExecution(null)}
            >
              <span className="execution-name">All Executions</span>
            </button>
            {executions.map(exec => (
              <button 
                key={exec.id}
                className={`execution-item ${selectedExecution === exec.id ? 'active' : ''}`}
                onClick={() => setSelectedExecution(exec.id)}
              >
                {getStatusIcon(exec.status)}
                <div className="execution-info">
                  <span className="execution-name">{exec.workflow?.name || 'Unknown'}</span>
                  <span className="execution-meta">
                    {new Date(exec.startedAt).toLocaleTimeString()}
                    {exec.duration && ` • ${exec.duration}ms`}
                  </span>
                </div>
                {(exec._count?.executionLogs || 0) > 0 && (
                  <span className="log-count">{exec._count?.executionLogs || 0}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="logs-main">
          <div className="logs-filters">
            <div className="search-box">
              <Search size={16} />
              <input
                type="text"
                placeholder="Search logs..."
                value={filters.search}
                onChange={e => setFilters({ ...filters, search: e.target.value })}
              />
            </div>
            
            <select 
              value={filters.level} 
              onChange={e => setFilters({ ...filters, level: e.target.value })}
              className="filter-select"
            >
              <option value="">All Levels</option>
              <option value="error">Error</option>
              <option value="warn">Warning</option>
              <option value="info">Info</option>
              <option value="debug">Debug</option>
            </select>

            <input
              type="date"
              value={filters.startDate}
              onChange={e => setFilters({ ...filters, startDate: e.target.value })}
              className="filter-date"
            />
            
            <input
              type="date"
              value={filters.endDate}
              onChange={e => setFilters({ ...filters, endDate: e.target.value })}
              className="filter-date"
            />

            {selectedExecution && (
              <button 
                className="btn btn-secondary btn-sm"
                onClick={() => handleExport(selectedExecution)}
              >
                <Download size={14} />
                Export
              </button>
            )}
          </div>

          {isLoading ? (
            <div className="logs-loading">Loading logs...</div>
          ) : logs.length === 0 ? (
            <div className="logs-empty">
              <Terminal size={48} />
              <p>No logs found</p>
            </div>
          ) : (
            <>
              <div className="logs-table">
                <div className="logs-header-row">
                  <span className="col-time">Time</span>
                  <span className="col-level">Level</span>
                  <span className="col-node">Node</span>
                  <span className="col-message">Message</span>
                  <span className="col-actions"></span>
                </div>
                
                {logs.map(log => (
                  <div 
                    key={log.id} 
                    className={`log-row level-${log.level} ${expandedLogs.has(log.id) ? 'expanded' : ''}`}
                  >
                    <span className="col-time">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <span className={`col-level level-badge ${log.level}`}>
                      {getLevelIcon(log.level)}
                      {log.level}
                    </span>
                    <span className="col-node" title={log.nodeId}>
                      {log.nodeName || log.nodeId?.slice(0, 8) || '-'}
                    </span>
                    <span className="col-message">{log.message}</span>
                    <span className="col-actions">
                      {(log.details || log.metadata) && (
                        <button 
                          className="expand-btn"
                          onClick={() => toggleLogExpand(log.id)}
                        >
                          {expandedLogs.has(log.id) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                      )}
                    </span>
                    
                    {expandedLogs.has(log.id) && (log.details || log.metadata) && (
                      <div className="log-details">
                        {log.details && (
                          <div className="details-section">
                            <h4>Details</h4>
                            <pre>{JSON.stringify(log.details, null, 2)}</pre>
                          </div>
                        )}
                        {log.metadata && (
                          <div className="details-section">
                            <h4>Metadata</h4>
                            <pre>{JSON.stringify(log.metadata, null, 2)}</pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {pagination.pages > 1 && (
                <div className="logs-pagination">
                  <button 
                    disabled={pagination.page === 1}
                    onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                  >
                    Previous
                  </button>
                  <span>Page {pagination.page} of {pagination.pages}</span>
                  <button 
                    disabled={pagination.page === pagination.pages}
                    onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
