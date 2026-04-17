import { NodeType } from '../../types';

export const scheduleTriggerNode: NodeType = {
  name: 'scheduleTrigger',
  displayName: 'Schedule Trigger',
  description: 'Trigger workflow on a schedule',
  icon: 'fa:clock',
  category: 'Triggers',
  version: 1,
  inputs: [],
  outputs: [
    {
      name: 'output',
      type: 'all',
      description: 'Scheduled trigger output'
    }
  ],
  properties: [
    {
      name: 'enabled',
      displayName: 'Enable Schedule',
      type: 'boolean',
      default: true,
      description: 'Enable or disable this schedule without deactivating the whole workflow'
    },
    {
      name: 'scheduleMode',
      displayName: 'Schedule Mode',
      type: 'options',
      options: [
        { name: 'Simple', value: 'simple' },
        { name: 'Custom (Cron)', value: 'custom' }
      ],
      default: 'simple',
      description: 'Use simple selectors or write a cron expression directly'
    },
    // ── Simple mode ──────────────────────────────────────────────────────────
    {
      name: 'frequency',
      displayName: 'Run',
      type: 'options',
      options: [
        { name: 'Every minute', value: 'every_minute' },
        { name: 'Every N minutes', value: 'every_n_minutes' },
        { name: 'Every hour', value: 'hourly' },
        { name: 'Every day', value: 'daily' },
        { name: 'Every week', value: 'weekly' },
        { name: 'Every month', value: 'monthly' }
      ],
      default: 'daily',
      displayOptions: { show: { scheduleMode: ['simple'] } }
    },
    {
      name: 'intervalMinutes',
      displayName: 'Every (minutes)',
      type: 'number',
      default: 15,
      description: 'Run every N minutes (e.g. 15 = every 15 minutes)',
      displayOptions: { show: { scheduleMode: ['simple'], frequency: ['every_n_minutes'] } }
    },
    {
      name: 'atMinute',
      displayName: 'At minute',
      type: 'number',
      default: 0,
      description: 'Minute past the hour (0–59)',
      displayOptions: { show: { scheduleMode: ['simple'], frequency: ['hourly'] } }
    },
    {
      name: 'atTime',
      displayName: 'At time',
      type: 'string',
      default: '09:00',
      placeholder: '09:00',
      description: 'Time in HH:MM (24-hour)',
      displayOptions: { show: { scheduleMode: ['simple'], frequency: ['daily', 'weekly', 'monthly'] } }
    },
    {
      name: 'weekDays',
      displayName: 'On days',
      type: 'multiselect',
      options: [
        { name: 'Mon', value: '1' },
        { name: 'Tue', value: '2' },
        { name: 'Wed', value: '3' },
        { name: 'Thu', value: '4' },
        { name: 'Fri', value: '5' },
        { name: 'Sat', value: '6' },
        { name: 'Sun', value: '0' }
      ],
      default: ['1'],
      description: 'Select one or more days',
      displayOptions: { show: { scheduleMode: ['simple'], frequency: ['weekly'] } }
    },
    {
      name: 'monthDays',
      displayName: 'On days of month',
      type: 'multiselect',
      options: Array.from({ length: 31 }, (_, i) => ({ name: String(i + 1), value: String(i + 1) })),
      default: ['1'],
      description: 'Select one or more days each month',
      displayOptions: { show: { scheduleMode: ['simple'], frequency: ['monthly'] } }
    },
    // ── Custom mode ───────────────────────────────────────────────────────────
    {
      name: 'cronExpression',
      displayName: 'Cron Expression',
      type: 'string',
      default: '0 9 * * *',
      placeholder: '0 9 * * *',
      description: 'Standard 5-field cron: minute hour day month weekday',
      displayOptions: { show: { scheduleMode: ['custom'] } }
    },
    // ── Shared ────────────────────────────────────────────────────────────────
    {
      name: 'timezone',
      displayName: 'Timezone',
      type: 'string',
      default: 'UTC',
      placeholder: 'Europe/Stockholm',
      description: 'IANA timezone name (e.g. Europe/Stockholm, America/New_York)'
    }
  ],
  execute: async (context) => {
    const now = new Date();
    return {
      success: true,
      output: [{
        json: {
          timestamp: now.toISOString(),
          unixTimestamp: Math.floor(now.getTime() / 1000),
          triggeredAt: now.toISOString()
        }
      }]
    };
  }
};
