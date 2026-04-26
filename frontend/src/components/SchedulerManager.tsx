import React, { useState, useEffect, useCallback } from 'react';
import { Clock, Play, Pause, RefreshCw, Zap, AlertCircle, CheckCircle, Loader2, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import { schedulerApi } from '../services/api';
import './SchedulerManager.css';
import { getErrorMessage } from '../utils/error-helper';

interface ScheduledTrigger {
  id: string;
  workflowId: string;
  workflowName: string;
  workflowActive: boolean;
  enabled: boolean;
  config: { cron: string; timezone?: string };
  lastTriggered: string | null;
  createdAt: string;
}

interface WorkerStatus {
  alive: boolean;
  lastSeen: string | null;
}

interface SchedulerStatus {
  worker: WorkerStatus;
  triggers: { total: number; enabled: number; disabled: number };
}

export function SchedulerManager() {
  const [triggers, setTriggers] = useState<ScheduledTrigger[]>([]);
  const [status, setStatus] = useState<SchedulerStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'enabled' | 'disabled'>('all');

  const load = useCallback(async () => {
    try {
      const [statusRes, triggersRes] = await Promise.all([
        schedulerApi.getStatus(),
        schedulerApi.getTriggers()
      ]);
      setStatus(statusRes.data.data);
      setTriggers(triggersRes.data.data?.triggers || triggersRes.data.data || []);
    } catch (err: unknown) {
      toast.error('Failed to load scheduler data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleToggle = async (trigger: ScheduledTrigger) => {
    setTogglingId(trigger.id);
    try {
      await schedulerApi.setEnabled(trigger.id, !trigger.enabled);
      setTriggers(prev => prev.map(t => t.id === trigger.id ? { ...t, enabled: !t.enabled } : t));
      setStatus(prev => {
        if (!prev) return prev;
        const delta = trigger.enabled ? -1 : 1;
        return { ...prev, triggers: { ...prev.triggers, enabled: prev.triggers.enabled + delta, disabled: prev.triggers.disabled - delta } };
      });
      toast.success(trigger.enabled ? 'Schedule disabled' : 'Schedule enabled');
    } catch (err: unknown) {
      toast.error('Failed to update schedule');
    } finally {
      setTogglingId(null);
    }
  };

  const handleRunNow = async (trigger: ScheduledTrigger) => {
    setRunningId(trigger.id);
    try {
      await schedulerApi.runNow(trigger.id);
      toast.success(`Triggered "${trigger.workflowName}"`);
      setTimeout(load, 1500);
    } catch (err: unknown) {
      toast.error('Failed to trigger workflow');
    } finally {
      setRunningId(null);
    }
  };

  const filtered = triggers.filter(t => {
    if (filter === 'enabled') return t.enabled;
    if (filter === 'disabled') return !t.enabled;
    return true;
  });

  const formatDate = (iso: string | null) => {
    if (!iso) return 'Never';
    const d = new Date(iso);
    return d.toLocaleString();
  };

  const workerAge = status?.worker.lastSeen
    ? Math.round((Date.now() - new Date(status.worker.lastSeen).getTime()) / 1000)
    : null;

  if (loading) {
    return (
      <div className="scheduler-loading">
        <Loader2 size={24} className="spinner" />
        <span>Loading scheduler...</span>
      </div>
    );
  }

  return (
    <div className="scheduler-manager">
      <div className="scheduler-header">
        <div className="scheduler-title">
          <Clock size={22} />
          <h1>Scheduler</h1>
        </div>
        <button className="btn btn-secondary btn-icon" onClick={load} title="Refresh">
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Worker + stats */}
      <div className="scheduler-stats">
        <div className={`stat-card worker-card ${status?.worker.alive ? 'alive' : 'dead'}`}>
          {status?.worker.alive
            ? <CheckCircle size={18} />
            : <AlertCircle size={18} />}
          <div>
            <div className="stat-label">Worker</div>
            <div className="stat-value">{status?.worker.alive ? 'Running' : 'Offline'}</div>
            {workerAge !== null && (
              <div className="stat-sub">Last seen {workerAge}s ago</div>
            )}
          </div>
        </div>
        <div className="stat-card">
          <Clock size={18} />
          <div>
            <div className="stat-label">Total Schedules</div>
            <div className="stat-value">{status?.triggers.total ?? '—'}</div>
          </div>
        </div>
        <div className="stat-card enabled">
          <CheckCircle size={18} />
          <div>
            <div className="stat-label">Enabled</div>
            <div className="stat-value">{status?.triggers.enabled ?? '—'}</div>
          </div>
        </div>
        <div className="stat-card disabled">
          <Pause size={18} />
          <div>
            <div className="stat-label">Disabled</div>
            <div className="stat-value">{status?.triggers.disabled ?? '—'}</div>
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="scheduler-filters">
        {(['all', 'enabled', 'disabled'] as const).map(f => (
          <button
            key={f}
            className={`filter-tab ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            <span className="filter-count">
              {f === 'all' ? triggers.length : f === 'enabled' ? (status?.triggers.enabled ?? 0) : (status?.triggers.disabled ?? 0)}
            </span>
          </button>
        ))}
      </div>

      {/* Trigger list */}
      {filtered.length === 0 ? (
        <div className="scheduler-empty">
          <Clock size={40} />
          <p>No {filter !== 'all' ? filter + ' ' : ''}scheduled triggers found.</p>
          <span>Activate a workflow that contains a Schedule Trigger node to add it here.</span>
        </div>
      ) : (
        <div className="trigger-list">
          {filtered.map(trigger => (
            <div key={trigger.id} className={`trigger-card ${trigger.enabled ? 'enabled' : 'disabled'}`}>
              <div className="trigger-status-dot" title={trigger.enabled ? 'Enabled' : 'Disabled'} />

              <div className="trigger-info">
                <div className="trigger-name">
                  {trigger.workflowName}
                  {!trigger.workflowActive && (
                    <span className="workflow-inactive-badge">workflow inactive</span>
                  )}
                </div>
                <div className="trigger-meta">
                  <span className="trigger-cron" title="Cron expression">
                    <Clock size={12} />
                    {(trigger.config as any)?.cron || '—'}
                  </span>
                  {(trigger.config as any)?.timezone && (
                    <span className="trigger-tz">{(trigger.config as any).timezone}</span>
                  )}
                  <span className="trigger-last">
                    Last run: {formatDate(trigger.lastTriggered)}
                  </span>
                </div>
              </div>

              <div className="trigger-actions">
                <button
                  className="btn btn-icon btn-run"
                  title="Run now"
                  disabled={runningId === trigger.id}
                  onClick={() => handleRunNow(trigger)}
                >
                  {runningId === trigger.id
                    ? <Loader2 size={15} className="spinner" />
                    : <Zap size={15} />}
                </button>

                <button
                  className={`btn btn-icon btn-toggle ${trigger.enabled ? 'pause' : 'play'}`}
                  title={trigger.enabled ? 'Disable' : 'Enable'}
                  disabled={togglingId === trigger.id}
                  onClick={() => handleToggle(trigger)}
                >
                  {togglingId === trigger.id
                    ? <Loader2 size={15} className="spinner" />
                    : trigger.enabled
                      ? <Pause size={15} />
                      : <Play size={15} />}
                </button>

                <a
                  className="btn btn-icon btn-link"
                  href={`/workflows/${trigger.workflowId}`}
                  title="Open workflow"
                >
                  <ExternalLink size={15} />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
