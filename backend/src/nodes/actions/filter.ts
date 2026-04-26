import { NodeType } from '../../types';
import { getErrorMessage } from '../../utils/error-helper';
import { validateExpression } from '../../utils/safe-eval';

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

        const getValue = (obj: any, path: string): any => {
          const keys = path.split('.');

          function traverse(current: any, keyIndex: number): any {
            if (current === null || current === undefined) {
              return undefined;
            }
            if (keyIndex >= keys.length) {
              return current;
            }
            if (Array.isArray(current)) {
              // Collect values from all array elements for the remaining path
              return current.map((item) => traverse(item, keyIndex));
            }
            return traverse(current[keys[keyIndex]], keyIndex + 1);
          }

          return traverse(obj, 0);
        };

        const matchesValue = (fieldValue: any, op: string, compareValue: string): boolean => {
          // If fieldValue is an array, check if ANY element matches
          if (Array.isArray(fieldValue)) {
            return fieldValue.some((element) => matchesValue(element, op, compareValue));
          }

          switch (op) {
            case 'eq':
              return fieldValue == compareValue;
            case 'ne':
              return fieldValue != compareValue;
            case 'gt':
              return Number(fieldValue) > Number(compareValue);
            case 'gte':
              return Number(fieldValue) >= Number(compareValue);
            case 'lt':
              return Number(fieldValue) < Number(compareValue);
            case 'lte':
              return Number(fieldValue) <= Number(compareValue);
            case 'contains':
              return String(fieldValue).toLowerCase().includes(String(compareValue).toLowerCase());
            case 'startsWith':
              return String(fieldValue).startsWith(String(compareValue));
            case 'endsWith':
              return String(fieldValue).endsWith(String(compareValue));
            case 'regex':
              return new RegExp(compareValue).test(String(fieldValue));
            case 'empty':
              return !fieldValue || (Array.isArray(fieldValue) && fieldValue.length === 0);
            case 'notEmpty':
              return !!fieldValue && (!Array.isArray(fieldValue) || fieldValue.length > 0);
            default:
              return false;
          }
        };

        for (const item of items) {
          const fieldValue = getValue(item.json, field);
          const isMatch = matchesValue(fieldValue, operator, value);

          if (isMatch) {
            matched.push(item);
          } else {
            unmatched.push(item);
          }
        }
      } else {
        const condition = context.getNodeParameter('condition', 'true') as string;

        // Validate condition for security
        const validation = validateExpression(condition);
        if (!validation.valid) {
          return {
            success: false,
            error: new Error(validation.error)
          };
        }

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
        output: matched
      };
    } catch (error: unknown) {
      if (context.continueOnFail()) {
        return {
          success: true,
          output: [{
            json: { error: getErrorMessage(error) }
          }]
        };
      }
      throw error;
    }
  }
};
