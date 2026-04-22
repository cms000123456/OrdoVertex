import { NodeType } from '../../types';
import { getErrorMessage } from '../../utils/error-helper';

export const waitNode: NodeType = {
  name: 'wait',
  displayName: 'Wait',
  description: 'Pause workflow execution for a specified time',
  icon: 'fa:pause',
  category: 'Actions',
  version: 1,
  inputs: [
    {
      name: 'input',
      type: 'all',
      description: 'Input data'
    }
  ],
  outputs: [
    {
      name: 'output',
      type: 'all',
      description: 'Output data (same as input)'
    }
  ],
  properties: [
    {
      name: 'unit',
      displayName: 'Unit',
      type: 'options',
      options: [
        { name: 'Milliseconds', value: 'milliseconds' },
        { name: 'Seconds', value: 'seconds' },
        { name: 'Minutes', value: 'minutes' },
        { name: 'Hours', value: 'hours' }
      ],
      default: 'seconds',
      description: 'Time unit'
    },
    {
      name: 'amount',
      displayName: 'Amount',
      type: 'number',
      default: 1,
      required: true,
      description: 'Amount of time to wait'
    }
  ],
  execute: async (context) => {
    try {
      const unit = context.getNodeParameter('unit', 'seconds') as string;
      const amount = context.getNodeParameter('amount', 1) as number;
      const items = context.getInputData();

      // Convert to milliseconds
      let ms: number;
      switch (unit) {
        case 'milliseconds':
          ms = amount;
          break;
        case 'seconds':
          ms = amount * 1000;
          break;
        case 'minutes':
          ms = amount * 60 * 1000;
          break;
        case 'hours':
          ms = amount * 60 * 60 * 1000;
          break;
        default:
          ms = amount * 1000;
      }

      // Cap at 5 minutes for safety in this demo
      const safeMs = Math.min(ms, 5 * 60 * 1000);

      await new Promise(resolve => setTimeout(resolve, safeMs));

      return {
        success: true,
        output: items
      };
    } catch (error: unknown) {
      if (context.continueOnFail()) {
        return {
          success: true,
          output: context.getInputData()
        };
      }
      throw error;
    }
  }
};
