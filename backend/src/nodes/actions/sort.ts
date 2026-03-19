import { NodeType } from '../../types';

export const sortNode: NodeType = {
  name: 'sort',
  displayName: 'Sort',
  description: 'Sort items by one or more fields',
  icon: 'fa:arrow-down-wide-short',
  category: 'Transform',
  version: 1,
  inputs: [
    {
      name: 'input',
      type: 'all',
      description: 'Input data to sort'
    }
  ],
  outputs: [
    {
      name: 'output',
      type: 'all',
      description: 'Sorted items'
    }
  ],
  properties: [
    {
      name: 'sortFields',
      displayName: 'Sort Fields',
      type: 'json',
      default: [
        { field: 'name', direction: 'asc' }
      ],
      description: 'Fields to sort by (array of {field, direction})'
    },
    {
      name: 'typeHandling',
      displayName: 'Type Handling',
      type: 'options',
      options: [
        { name: 'Auto-detect', value: 'auto' },
        { name: 'String', value: 'string' },
        { name: 'Number', value: 'number' },
        { name: 'Date', value: 'date' }
      ],
      default: 'auto',
      description: 'How to interpret values during sorting'
    }
  ],
  execute: async (context) => {
    try {
      const sortFields = context.getNodeParameter('sortFields', [{ field: 'name', direction: 'asc' }]) as Array<{ field: string; direction: 'asc' | 'desc' }>;
      const typeHandling = context.getNodeParameter('typeHandling', 'auto') as string;
      const items = context.getInputData();

      const getValue = (obj: any, path: string) => {
        return path.split('.').reduce((o, k) => o?.[k], obj);
      };

      const parseValue = (value: any, type: string) => {
        if (type === 'number') return Number(value) || 0;
        if (type === 'date') return new Date(value).getTime() || 0;
        if (type === 'string') return String(value).toLowerCase();
        
        // Auto-detect
        if (typeof value === 'number') return value;
        if (!isNaN(Number(value)) && value !== '') return Number(value);
        if (!isNaN(Date.parse(value))) return new Date(value).getTime();
        return String(value).toLowerCase();
      };

      const sorted = [...items].sort((a, b) => {
        for (const { field, direction } of sortFields) {
          const aVal = getValue(a.json, field);
          const bVal = getValue(b.json, field);

          const aParsed = parseValue(aVal, typeHandling);
          const bParsed = parseValue(bVal, typeHandling);

          if (aParsed < bParsed) return direction === 'asc' ? -1 : 1;
          if (aParsed > bParsed) return direction === 'asc' ? 1 : -1;
        }
        return 0;
      });

      return {
        success: true,
        output: sorted
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
