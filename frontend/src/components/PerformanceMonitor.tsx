import React, { useState, useEffect, useCallback } from 'react';
import { Activity, Cpu, MemoryStick, HardDrive, Clock, RefreshCw, Server, Database, AlertTriangle } from 'lucide-react';
import './PerformanceMonitor.css';

interface SystemStats {
  cpu: {
    usage: number;
    cores: number;
    loadAvg: number[];
  };
  memory: {
    total: number;
    used: number;
    free: number;
    percentage: number;
  };
  disk: {
    total: number;
    used: number;
    free: number;
    percentage: number;
  };
  uptime: number;
  nodeVersion: string;
  timestamp: string;
}

interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

interface DBStats {
  connections: number;
  slowQueries: number;
  totalQueries: number;
}

export function PerformanceMonitor() {
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [queueStats, setQueueStats] = useState<QueueStats | null>(null);
  const [dbStats, setDbStats] = useState<DBStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch system stats
      const systemRes = await fetch('/api/admin/system-stats');
      const systemData = await systemRes.json();
      
      if (systemData.success) {
        setSystemStats(systemData.data);
      } else {
        console.error('System stats error:', systemData.error);
      }
      
      // Fetch queue stats
      const queueRes = await fetch('/api/executions/stats');
      const queueData = await queueRes.json();
      
      if (queueData.success) {
        setQueueStats(queueData.data);
      }
      
      setLastUpdated(new Date());
      setError(null);
    } catch (err: any) {
      console.error('Fetch stats error:', err);
      setError('Failed to fetch stats: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(fetchStats, 5000); // Refresh every 5 seconds
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [fetchStats, autoRefresh]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getStatusColor = (percentage: number) => {
    if (percentage < 50) return 'good';
    if (percentage < 80) return 'warning';
    return 'critical';
  };

  if (loading) {
    return (
      <div className="performance-monitor">
        <div className="loading-state">
          <Activity className="spin" size={32} />
          <p>Loading performance metrics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="performance-monitor">
      <div className="monitor-header">
        <h1><Activity size={24} /> Performance Monitor</h1>
        <div className="header-actions">
          {lastUpdated && (
            <span className="last-updated">
              <Clock size={14} />
              Last updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <label className="auto-refresh">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Auto-refresh
          </label>
          <button className="btn btn-secondary" onClick={fetchStats}>
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      <div className="metrics-grid">
        {/* CPU Card */}
        <div className="metric-card">
          <div className="metric-header">
            <Cpu size={20} />
            <h3>CPU Usage</h3>
          </div>
          {systemStats ? (
            <>
              <div className={`metric-value ${getStatusColor(systemStats.cpu.usage)}`}>
                {systemStats.cpu.usage.toFixed(1)}%
              </div>
              <div className="metric-details">
                <div>Cores: {systemStats.cpu.cores}</div>
                <div>Load: {systemStats.cpu.loadAvg.map(l => l.toFixed(2)).join(', ')}</div>
              </div>
              <div className="progress-bar">
                <div 
                  className={`progress-fill ${getStatusColor(systemStats.cpu.usage)}`}
                  style={{ width: `${Math.min(systemStats.cpu.usage, 100)}%` }}
                />
              </div>
            </>
          ) : (
            <div className="no-data">No data available</div>
          )}
        </div>

        {/* Memory Card */}
        <div className="metric-card">
          <div className="metric-header">
            <MemoryStick size={20} />
            <h3>Memory</h3>
          </div>
          {systemStats ? (
            <>
              <div className={`metric-value ${getStatusColor(systemStats.memory.percentage)}`}>
                {systemStats.memory.percentage.toFixed(1)}%
              </div>
              <div className="metric-details">
                <div>Used: {formatBytes(systemStats.memory.used)}</div>
                <div>Total: {formatBytes(systemStats.memory.total)}</div>
                <div>Free: {formatBytes(systemStats.memory.free)}</div>
              </div>
              <div className="progress-bar">
                <div 
                  className={`progress-fill ${getStatusColor(systemStats.memory.percentage)}`}
                  style={{ width: `${Math.min(systemStats.memory.percentage, 100)}%` }}
                />
              </div>
            </>
          ) : (
            <div className="no-data">No data available</div>
          )}
        </div>

        {/* Disk Card */}
        <div className="metric-card">
          <div className="metric-header">
            <HardDrive size={20} />
            <h3>Disk Usage</h3>
          </div>
          {systemStats ? (
            <>
              <div className={`metric-value ${getStatusColor(systemStats.disk.percentage)}`}>
                {systemStats.disk.percentage.toFixed(1)}%
              </div>
              <div className="metric-details">
                <div>Used: {formatBytes(systemStats.disk.used)}</div>
                <div>Total: {formatBytes(systemStats.disk.total)}</div>
                <div>Free: {formatBytes(systemStats.disk.free)}</div>
              </div>
              <div className="progress-bar">
                <div 
                  className={`progress-fill ${getStatusColor(systemStats.disk.percentage)}`}
                  style={{ width: `${Math.min(systemStats.disk.percentage, 100)}%` }}
                />
              </div>
            </>
          ) : (
            <div className="no-data">No data available</div>
          )}
        </div>

        {/* Queue Stats Card */}
        <div className="metric-card">
          <div className="metric-header">
            <Server size={20} />
            <h3>Job Queue</h3>
          </div>
          {queueStats ? (
            <div className="queue-stats">
              <div className="queue-item">
                <span className="queue-label">Waiting</span>
                <span className="queue-value waiting">{queueStats.waiting}</span>
              </div>
              <div className="queue-item">
                <span className="queue-label">Active</span>
                <span className="queue-value active">{queueStats.active}</span>
              </div>
              <div className="queue-item">
                <span className="queue-label">Completed</span>
                <span className="queue-value completed">{queueStats.completed}</span>
              </div>
              <div className="queue-item">
                <span className="queue-label">Failed</span>
                <span className="queue-value failed">{queueStats.failed}</span>
              </div>
              <div className="queue-item">
                <span className="queue-label">Delayed</span>
                <span className="queue-value delayed">{queueStats.delayed}</span>
              </div>
            </div>
          ) : (
            <div className="no-data">No data available</div>
          )}
        </div>

        {/* System Info Card */}
        <div className="metric-card wide">
          <div className="metric-header">
            <Database size={20} />
            <h3>System Information</h3>
          </div>
          {systemStats ? (
            <div className="system-info">
              <div className="info-row">
                <span className="info-label">Uptime:</span>
                <span className="info-value">{formatDuration(systemStats.uptime)}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Node Version:</span>
                <span className="info-value">{systemStats.nodeVersion}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Timestamp:</span>
                <span className="info-value">{new Date(systemStats.timestamp).toLocaleString()}</span>
              </div>
            </div>
          ) : (
            <div className="no-data">No data available</div>
          )}
        </div>
      </div>

      <div className="monitor-footer">
        <p>Performance metrics are collected in real-time from the server.</p>
        <p className="hint">High usage indicators: CPU/Memory/Disk {'>'} 80% (red), {'>'} 50% (yellow)</p>
      </div>
    </div>
  );
}
