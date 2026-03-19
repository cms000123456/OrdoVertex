import { NodeType } from '../../types';

export const removeDuplicatesNode: NodeType = {
  name: 'removeDuplicates',
  displayName: 'Remove Duplicates',
  description: 'Remove duplicate items based on field values',
  icon: 'fa:clone',
  category: 'Transform',
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
      description: 'Unique items'
    },
    {
      name: 'duplicates',
      type: 'all',
      description: 'Removed duplicate items'
    }
  ],
  properties: [
    {
      name: 'fields',
      displayName: 'Compare Fields',
      type: 'json',
      default: ['id'],
      description: 'Fields to compare for duplicates (supports dot notation)'
    },
    {
      name: 'keep',
      displayName: 'Keep',
      type: 'options',
      options: [
        { name: 'First Occurrence', value: 'first' },
        { name: 'Last Occurrence', value: 'last' }
      ],
      default: 'first',
      description: 'Which occurrence to keep'
    },
    {
      name: 'caseSensitive',
      displayName: 'Case Sensitive',
      type: 'boolean',
      default: false,
      description: 'Consider case when comparing strings'
    }
  ],
  execute: async (context) => {
    try {
      const fields = context.getNodeParameter('fields', ['id']) as string[];
      const keep = context.getNodeParameter('keep', 'first') as string;
      const caseSensitive = context.getNodeParameter('caseSensitive', false) as boolean;
      const items = context.getInputData();

      const getValue = (obj: any, path: string) => {
        return path.split('.').reduce((o, k) => o?.[k], obj);
      };

      const makeKey = (item: any) => {
        const values = fields.map(f => {
          const val = getValue(item.json, f);
          if (typeof val === 'string' && !caseSensitive) {
            return val.toLowerCase();
          }
          return val;
        });
        return JSON.stringify(values);
      };

      const seen = new Set<string>();
      const unique: any[] = [];
      const duplicates: any[] = [];

      if (keep === 'first') {
        for (const item of items) {
          const key = makeKey(item);
          if (seen.has(key)) {
            duplicates.push(item);
          } else {
            seen.add(key);
            unique.push(item);
          }
        }
      } else {
        // Keep last - iterate in reverse
        for (let i = items.length - 1; i >= 0; i--) {
          const item = items[i];
          const key = makeKey(item);
          if (seen.has(key)) {
            duplicates.push(item);
          } else {
            seen.add(key);
            unique.unshift(item);
          }
        }
      }

      return {
        success: true,
        output: [
          ...unique,
          ...duplicates.map(item => ({ ...item, _duplicate: true }))
        ]
      };
    } catch (error: any) {
      if (context.continueOnFail()) {
        return {
          success: true,
          output: [{
            json: { error: error.message }
          }]
        };
      }
      throw error;
    }
  }
};
