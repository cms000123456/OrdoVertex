import { NodeType } from '../../types';
import { getErrorMessage } from '../../utils/error-helper';

export const ifNode: NodeType = {
  name: 'if',
  displayName: 'IF',
  description: 'Split workflow based on conditions',
  icon: 'fa:code-branch',
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
      name: 'true',
      type: 'all',
      description: 'Items that match the condition'
    },
    {
      name: 'false',
      type: 'all',
      description: 'Items that do not match the condition'
    }
  ],
  properties: [
    {
      name: 'conditions',
      displayName: 'Conditions',
      type: 'json',
      default: [
        {
          leftValue: '',
          operator: 'equals',
          rightValue: ''
        }
      ],
      description: 'Array of conditions to evaluate'
    },
    {
      name: 'combineType',
      displayName: 'Combine Conditions',
      type: 'options',
      options: [
        { name: 'AND', value: 'and', description: 'All conditions must be true' },
        { name: 'OR', value: 'or', description: 'At least one condition must be true' }
      ],
      default: 'and',
      description: 'How to combine multiple conditions'
    }
  ],
  execute: async (context) => {
    try {
      const conditions = context.getNodeParameter('conditions', []) as Array<{
        leftValue: string;
        operator: string;
        rightValue: any;
      }>;
      const combineType = context.getNodeParameter('combineType', 'and') as 'and' | 'or';
      const items = context.getInputData();

      const trueItems: any[] = [];
      const falseItems: any[] = [];

      for (const item of items) {
        let result: boolean;

        if (combineType === 'and') {
          result = conditions.every(condition => evaluateCondition(condition, item.json));
        } else {
          result = conditions.some(condition => evaluateCondition(condition, item.json));
        }

        if (result) {
          trueItems.push(item);
        } else {
          falseItems.push(item);
        }
      }

      return {
        success: true,
        output: [
          // True branch
          ...trueItems,
          // False branch
          ...falseItems
        ],
        // Additional metadata for the engine to route correctly
        _branchOutput: {
          true: trueItems,
          false: falseItems
        }
      };
    } catch (error: unknown) {
      if (context.continueOnFail()) {
        return {
          success: true,
          output: [{
            json: {
              error: getErrorMessage(error)
            }
          }]
        };
      }
      throw error;
    }
  }
};

function evaluateCondition(
  condition: { leftValue: string; operator: string; rightValue: any },
  itemData: Record<string, any>
): boolean {
  const leftValue = resolveValue(condition.leftValue, itemData);
  const rightValue = resolveValue(condition.rightValue, itemData);

  switch (condition.operator) {
    case 'equals':
      return leftValue == rightValue;
    case 'notEquals':
      return leftValue != rightValue;
    case 'contains':
      if (typeof leftValue === 'string') {
        return leftValue.includes(String(rightValue));
      }
      if (Array.isArray(leftValue)) {
        return leftValue.includes(rightValue);
      }
      return false;
    case 'notContains':
      if (typeof leftValue === 'string') {
        return !leftValue.includes(String(rightValue));
      }
      if (Array.isArray(leftValue)) {
        return !leftValue.includes(rightValue);
      }
      return true;
    case 'greaterThan':
      return Number(leftValue) > Number(rightValue);
    case 'lessThan':
      return Number(leftValue) < Number(rightValue);
    case 'greaterThanOrEqual':
      return Number(leftValue) >= Number(rightValue);
    case 'lessThanOrEqual':
      return Number(leftValue) <= Number(rightValue);
    case 'startsWith':
      return String(leftValue).startsWith(String(rightValue));
    case 'endsWith':
      return String(leftValue).endsWith(String(rightValue));
    case 'matchesRegex':
      try {
        const regex = new RegExp(String(rightValue));
        return regex.test(String(leftValue));
      } catch {
        return false;
      }
    case 'exists':
      return leftValue !== undefined && leftValue !== null;
    case 'notExists':
      return leftValue === undefined || leftValue === null;
    case 'isEmpty':
      if (leftValue === undefined || leftValue === null) return true;
      if (typeof leftValue === 'string') return leftValue.length === 0;
      if (Array.isArray(leftValue)) return leftValue.length === 0;
      if (typeof leftValue === 'object') return Object.keys(leftValue).length === 0;
      return false;
    case 'isNotEmpty':
      if (leftValue === undefined || leftValue === null) return false;
      if (typeof leftValue === 'string') return leftValue.length > 0;
      if (Array.isArray(leftValue)) return leftValue.length > 0;
      if (typeof leftValue === 'object') return Object.keys(leftValue).length > 0;
      return true;
    default:
      return false;
  }
}

function resolveValue(value: any, itemData: Record<string, any>): any {
  if (typeof value !== 'string') {
    return value;
  }

  // Check if it's an expression like {{ $json.field }}
  const expressionMatch = value.match(/^\{\{\s*(.+?)\s*\}\}$/);
  if (expressionMatch) {
    const path = expressionMatch[1].replace('$json.', '');
    return getValueByPath(itemData, path);
  }

  return value;
}

function getValueByPath(obj: any, path: string): any {
  const keys = path.split('.');
  let current = obj;
  
  for (const key of keys) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = current[key];
  }
  
  return current;
}
