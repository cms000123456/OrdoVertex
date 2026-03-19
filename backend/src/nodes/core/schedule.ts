import { NodeType } from '../../types';

export const scheduleTriggerNode: NodeType = {
  name: 'scheduleTrigger',
  displayName: 'Schedule Trigger',
  description: 'Trigger workflow on a schedule using cron expression',
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
      name: 'cronExpression',
      displayName: 'Cron Expression',
      type: 'string',
      default: '0 9 * * *',
      placeholder: '0 9 * * *',
      description: 'Cron expression (e.g., "0 9 * * *" for daily at 9 AM)'
    },
    {
      name: 'timezone',
      displayName: 'Timezone',
      type: 'string',
      default: 'UTC',
      placeholder: 'America/New_York',
      description: 'Timezone for the schedule'
    }
  ],
  execute: async (context) => {
    // Schedule trigger includes timestamp
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
