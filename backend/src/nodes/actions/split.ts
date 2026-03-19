import { NodeType } from '../../types';

export const splitNode: NodeType = {
  name: 'split',
  displayName: 'Split In Batches',
  description: 'Split data into batches for processing',
  icon: 'fa:layer-group',
  category: 'Transform',
  version: 1,
  inputs: [
    {
      name: 'input',
      type: 'all',
      description: 'Input data array'
    }
  ],
  outputs: [
    {
      name: 'output',
      type: 'all',
      description: 'Batched output'
    }
  ],
  properties: [
    {
      name: 'batchSize',
      displayName: 'Batch Size',
      type: 'number',
      default: 10,
      required: true,
      description: 'Number of items per batch'
    },
    {
      name: 'options',
      displayName: 'Options',
      type: 'json',
      default: {},
      description: 'Additional options'
    }
  ],
  execute: async (context) => {
    try {
      const batchSize = context.getNodeParameter('batchSize', 10) as number;
      const items = context.getInputData();

      // Ensure batchSize is reasonable
      const safeBatchSize = Math.max(1, Math.min(batchSize, 1000));

      // Split into batches
      const batches: any[] = [];
      for (let i = 0; i < items.length; i += safeBatchSize) {
        const batch = items.slice(i, i + safeBatchSize);
        batches.push({
          json: {
            batchIndex: Math.floor(i / safeBatchSize),
            batchSize: batch.length,
            totalItems: items.length,
            items: batch
          }
        });
      }

      return {
        success: true,
        output: batches.length > 0 ? batches : [{ json: { items: [] } }]
      };
    } catch (error: any) {
      if (context.continueOnFail()) {
        return {
          success: true,
          output: [{ json: { error: error.message, items: [] } }]
        };
      }
      throw error;
    }
  }
};
