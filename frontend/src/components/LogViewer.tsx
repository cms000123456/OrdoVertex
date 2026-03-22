import React, { useEffect, useState, useRef } from 'react';
import { Terminal, RefreshCw, AlertCircle, ChevronDown, Download, Trash2, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { logsApi } from '../services/api';
import './LogViewer.css';

interface LogFile {
  name: string;
  file: string;
  size: number;
  updated: string;
}

interface LogData {
  logName: string;
  lines: number;
  logs: string[];
  timestamp: string;
}

const LOG_TYPES = [
  { id: 'api', name: 'API Server', color: '#6366f1' },
  { id: 'worker', name: 'Worker', color: '#f59e0b' },
  { id: 'scheduler', name: 'Scheduler', color: '#10b981' },
  { id: 'system', name: 'System', color: '#ef4444' }
];

const LINE_OPTIONS = [50, 100, 250, 500, 1000];

export function LogViewer() {
  const [logFiles, setLogFiles] = useState<LogFile[]>([]);
  const [selectedLog, setSelectedLog] = useState('api');
  const [lines, setLines] = useState(100);
  const [logData, setLogData] = useState<LogData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const logsEndRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchLogFiles = async () => {
    try {
      const response = await logsApi.getLogFiles();
      setLogFiles(response.data.data.logs || []);
    } catch (error: any) {
      console.error('Failed to fetch log files');
    }
  };

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const response = await logsApi.getLogs(selectedLog, lines, searchTerm);
      setLogData(response.data.data);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to fetch logs');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogFiles();
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [selectedLog, lines]);

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(fetchLogs, 5000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoRefresh, selectedLog, lines, searchTerm]);

  const scrollToBottom = () => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const downloadLogs = async () => {
    try {
      const response = await logsApi.downloadLogs(selectedLog);
      const blob = new Blob([response.data], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedLog}-logs-${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Logs downloaded');
    } catch (error: any) {
      toast.error('Failed to download logs');
    }
  };

  const clearLogs = async () => {
    if (!window.confirm(`Clear ${selectedLog} logs? This cannot be undone.`)) {
      return;
    }
    try {
      await logsApi.clearLogs(selectedLog);
      toast.success('Logs cleared');
      fetchLogs();
    } catch (error: any) {
      toast.error('Failed to clear logs');
    }
  };

  const getLogLevel = (line: string): { level: string; color: string } => {
    const lower = line.toLowerCase();
    if (lower.includes('error') || lower.includes('❌') || lower.includes('"level":"error"')) {
      return { level: 'error', color: '#ef4444' };
    }
    if (lower.includes('warn') || lower.includes('⚠️') || lower.includes('"level":"warn"')) {
      return { level: 'warn', color: '#fbbf24' };
    }
    if (lower.includes('info') || lower.includes('ℹ️') || lower.includes('"level":"info"')) {
      return { level: 'info', color: '#60a5fa' };
    }
    if (lower.includes('debug') || lower.includes('"level":"debug"')) {
      return { level: 'debug', color: '#94a3b8' };
    }
    return { level: 'default', color: '#e2e8f0' };
  };

  const formatLogLine = (line: string): string => {
    try {
      const parsed = JSON.parse(line);
      if (parsed.message) {
        const timestamp = parsed.timestamp ? new Date(parsed.timestamp).toLocaleTimeString() : '';
        return `${timestamp} [${parsed.level?.toUpperCase() || 'LOG'}] ${parsed.message}`;
      }
    } catch (e) {
      // Not JSON, return as-is
    }
    return line;
  };

  return (
    <div className="log-viewer">
      <div className="log-viewer-header">
        <div className="log-viewer-title">
          <Terminal size={28} />
          <div>
            <h1>App Logs</h1>
            <p>View application logs for troubleshooting</p>
          </div>
        </div>
      </div>

      <div className="log-viewer-controls">
        <div className="control-group">
          <label>Log Source</label>
          <select 
            value={selectedLog} 
            onChange={(e) => setSelectedLog(e.target.value)}
            className="control-select"
          >
            {LOG_TYPES.map(log => (
              <option key={log.id} value={log.id}>
                {log.name}
              </option>
            ))}
          </select>
        </div>

        <div className="control-group">
          <label>Lines</label>
          <select 
            value={lines} 
            onChange={(e) => setLines(Number(e.target.value))}
            className="control-select"
          >
            {LINE_OPTIONS.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>

        <div className="control-group search-group">
          <label>Search</label>
          <input
            type="text"
            placeholder="Filter logs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && fetchLogs()}
            className="control-input"
          />
        </div>

        <div className="control-group checkbox-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Auto-refresh (5s)
          </label>
        </div>

        <div className="control-buttons">
          <button 
            className="btn btn-secondary"
            onClick={fetchLogs}
            disabled={isLoading}
          >
            <RefreshCw size={16} className={isLoading ? 'spin' : ''} />
            Refresh
          </button>
          <button 
            className="btn btn-secondary"
            onClick={downloadLogs}
            disabled={!logData}
          >
            <Download size={16} />
            Download
          </button>
          <button 
            className="btn btn-secondary"
            onClick={clearLogs}
            disabled={!logData}
          >
            <Trash2 size={16} />
            Clear
          </button>
        </div>
      </div>

      <div className="log-viewer-stats">
        {logData && (
          <>
            <span className="stat-item">
              <strong>{logData.lines}</strong> lines
            </span>
            <span className="stat-item">
              Last updated: {new Date(logData.timestamp).toLocaleTimeString()}
            </span>
            {searchTerm && (
              <span className="stat-item">
                Filtered results
              </span>
            )}
          </>
        )}
      </div>

      <div className="log-viewer-content">
        {isLoading && !logData ? (
          <div className="log-loading">
            <RefreshCw size={32} className="spin" />
            <p>Loading logs...</p>
          </div>
        ) : !logData || logData.logs.length === 0 ? (
          <div className="log-empty">
            <FileText size={48} />
            <p>{searchTerm ? 'No matching logs found' : 'No logs available'}</p>
          </div>
        ) : (
          <div className="log-lines">
            {logData.logs.map((line, index) => {
              const { color } = getLogLevel(line);
              const formatted = formatLogLine(line);
              return (
                <div 
                  key={index} 
                  className="log-line"
                  style={{ color }}
                  title={line}
                >
                  <span className="log-line-number">{(index + 1).toString().padStart(4, '0')}</span>
                  <span className="log-line-content">{formatted}</span>
                </div>
              );
            })}
            <div ref={logsEndRef} />
          </div>
        )}
      </div>

      <button 
        className="scroll-bottom-btn"
        onClick={scrollToBottom}
        title="Scroll to bottom"
      >
        <ChevronDown size={20} />
      </button>
    </div>
  );
}
