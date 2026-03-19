import { NodeType } from '../../types';

export const filterNode: NodeType = {
  name: 'filter',
  displayName: 'Filter',
  description: 'Filter items based on conditions',
  icon: 'fa:filter',
  category: 'Transform',
  version: 1,
  inputs: [
    {
      name: 'input',
      type: 'all',
      description: 'Input data to filter'
    }
  ],
  outputs: [
    {
      name: 'output',
      type: 'all',
      description: 'Filtered items'
    },
    {
      name: 'unmatched',
      type: 'all',
      description: 'Items that did not match'
    }
  ],
  properties: [
    {
      name: 'mode',
      displayName: 'Mode',
      type: 'options',
      options: [
        { name: 'Simple Condition', value: 'simple' },
        { name: 'Advanced (JavaScript)', value: 'advanced' }
      ],
      default: 'simple',
      description: 'Filter mode'
    },
    {
      name: 'field',
      displayName: 'Field',
      type: 'string',
      default: '',
      placeholder: 'e.g., status or user.name',
      description: 'Field to filter on (supports dot notation)',
      displayOptions: {
        show: {
          mode: ['simple']
        }
      }
    },
    {
      name: 'operator',
      displayName: 'Operator',
      type: 'options',
      options: [
        { name: 'Equals', value: 'eq' },
        { name: 'Not Equals', value: 'ne' },
        { name: 'Greater Than', value: 'gt' },
        { name: 'Greater Than or Equal', value: 'gte' },
        { name: 'Less Than', value: 'lt' },
        { name: 'Less Than or Equal', value: 'lte' },
        { name: 'Contains', value: 'contains' },
        { name: 'Starts With', value: 'startsWith' },
        { name: 'Ends With', value: 'endsWith' },
        { name: 'Matches Regex', value: 'regex' },
        { name: 'Is Empty', value: 'empty' },
        { name: 'Is Not Empty', value: 'notEmpty' }
      ],
      default: 'eq',
      description: 'Comparison operator',
      displayOptions: {
        show: {
          mode: ['simple']
        }
      }
    },
    {
      name: 'value',
      displayName: 'Value',
      type: 'string',
      default: '',
      placeholder: 'value to compare',
      description: 'Value to compare against',
      displayOptions: {
        show: {
          mode: ['simple'],
          operator: ['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'contains', 'startsWith', 'endsWith', 'regex']
        }
      }
    },
    {
      name: 'condition',
      displayName: 'Condition',
      type: 'multiline',
      default: 'item.status === "active"',
      placeholder: 'JavaScript expression returning true/false',
      description: 'JavaScript condition (item variable available)',
      displayOptions: {
        show: {
          mode: ['advanced']
        }
      }
    }
  ],
  execute: async (context) => {
    try {
      const mode = context.getNodeParameter('mode', 'simple') as string;
      const items = context.getInputData();

      let matched: any[] = [];
      let unmatched: any[] = [];

      if (mode === 'simple') {
        const field = context.getNodeParameter('field', '') as string;
        const operator = context.getNodeParameter('operator', 'eq') as string;
        const value = context.getNodeParameter('value', '') as string;

        const getValue = (obj: any, path: string) => {
          return path.split('.').reduce((o, k) => o?.[k], obj);
        };

        for (const item of items) {
          const fieldValue = getValue(item.json, field);
          let isMatch = false;

          switch (operator) {
            case 'eq':
              isMatch = fieldValue == value;
              break;
            case 'ne':
              isMatch = fieldValue != value;
              break;
            case 'gt':
              isMatch = Number(fieldValue) > Number(value);
              break;
            case 'gte':
              isMatch = Number(fieldValue) >= Number(value);
              break;
            case 'lt':
              isMatch = Number(fieldValue) < Number(value);
              break;
            case 'lte':
              isMatch = Number(fieldValue) <= Number(value);
              break;
            case 'contains':
              isMatch = String(fieldValue).toLowerCase().includes(String(value).toLowerCase());
              break;
            case 'startsWith':
              isMatch = String(fieldValue).startsWith(String(value));
              break;
            case 'endsWith':
              isMatch = String(fieldValue).endsWith(String(value));
              break;
            case 'regex':
              isMatch = new RegExp(value).test(String(fieldValue));
              break;
            case 'empty':
              isMatch = !fieldValue || (Array.isArray(fieldValue) && fieldValue.length === 0);
              break;
            case 'notEmpty':
              isMatch = !!fieldValue && (!Array.isArray(fieldValue) || fieldValue.length > 0);
              break;
          }

          if (isMatch) {
            matched.push(item);
          } else {
            unmatched.push(item);
          }
        }
      } else {
        const condition = context.getNodeParameter('condition', 'true') as string;

        for (const item of items) {
          try {
            const result = Function('item', `"use strict"; return (${condition})`)(item.json);
            if (result) {
              matched.push(item);
            } else {
              unmatched.push(item);
            }
          } catch (e) {
            unmatched.push(item);
          }
        }
      }

      return {
        success: true,
        output: [
          ...matched,
          ...unmatched.map(item => ({ ...item, _unmatched: true }))
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
