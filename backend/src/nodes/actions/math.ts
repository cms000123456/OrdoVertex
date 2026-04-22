import { NodeType } from '../../types';
import { validateExpression } from '../../utils/safe-eval';

export const mathNode: NodeType = {
  name: 'math',
  displayName: 'Math',
  description: 'Perform mathematical operations',
  icon: 'fa:calculator',
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
      description: 'Output with calculations'
    }
  ],
  properties: [
    {
      name: 'mode',
      displayName: 'Mode',
      type: 'options',
      options: [
        { name: 'Single Operation', value: 'single' },
        { name: 'Expression', value: 'expression' },
        { name: 'Multiple Operations', value: 'multiple' }
      ],
      default: 'single',
      description: 'Calculation mode'
    },
    {
      name: 'operation',
      displayName: 'Operation',
      type: 'options',
      options: [
        { name: 'Add', value: 'add' },
        { name: 'Subtract', value: 'subtract' },
        { name: 'Multiply', value: 'multiply' },
        { name: 'Divide', value: 'divide' },
        { name: 'Power', value: 'power' },
        { name: 'Square Root', value: 'sqrt' },
        { name: 'Absolute', value: 'abs' },
        { name: 'Round', value: 'round' },
        { name: 'Floor', value: 'floor' },
        { name: 'Ceiling', value: 'ceil' },
        { name: 'Min', value: 'min' },
        { name: 'Max', value: 'max' },
        { name: 'Sum', value: 'sum' },
        { name: 'Average', value: 'avg' },
        { name: 'Modulo', value: 'mod' },
        { name: 'Percentage', value: 'percentage' }
      ],
      default: 'add',
      description: 'Math operation',
      displayOptions: {
        show: {
          mode: ['single']
        }
      }
    },
    {
      name: 'field',
      displayName: 'Field',
      type: 'string',
      default: 'value',
      description: 'Field containing the value',
      displayOptions: {
        show: {
          mode: ['single']
        }
      }
    },
    {
      name: 'operand',
      displayName: 'Operand / Value',
      type: 'number',
      default: 0,
      description: 'Second value for binary operations',
      displayOptions: {
        show: {
          mode: ['single'],
          operation: ['add', 'subtract', 'multiply', 'divide', 'power', 'mod', 'percentage']
        }
      }
    },
    {
      name: 'decimals',
      displayName: 'Decimal Places',
      type: 'number',
      default: 2,
      description: 'Number of decimal places for rounding',
      displayOptions: {
        show: {
          mode: ['single'],
          operation: ['round']
        }
      }
    },
    {
      name: 'expression',
      displayName: 'Expression',
      type: 'multiline',
      default: 'field1 + field2',
      placeholder: 'e.g., price * (1 + taxRate)',
      description: 'JavaScript math expression (field names are variables)',
      displayOptions: {
        show: {
          mode: ['expression']
        }
      }
    },
    {
      name: 'outputField',
      displayName: 'Output Field',
      type: 'string',
      default: 'result',
      description: 'Field to store the result'
    },
    {
      name: 'operations',
      displayName: 'Operations',
      type: 'json',
      default: [
        { field: 'price', operation: 'multiply', operand: 1.2, outputField: 'priceWithTax' }
      ],
      description: 'Array of operations to perform',
      displayOptions: {
        show: {
          mode: ['multiple']
        }
      }
    }
  ],
  execute: async (context) => {
    try {
      const mode = context.getNodeParameter('mode', 'single') as string;
      const outputField = context.getNodeParameter('outputField', 'result') as string;
      const items = context.getInputData();

      const getValue = (obj: any, path: string) => {
        return path.split('.').reduce((o, k) => o?.[k], obj);
      };

      const setValue = (obj: any, path: string, value: any) => {
        const keys = path.split('.');
        let target = obj;
        for (let i = 0; i < keys.length - 1; i++) {
          if (!(keys[i] in target)) {
            target[keys[i]] = {};
          }
          target = target[keys[i]];
        }
        target[keys[keys.length - 1]] = value;
        return obj;
      };

      const applyOperation = (value: number, operation: string, operand: number, decimals: number = 2) => {
        let result: number;

        switch (operation) {
          case 'add':
            result = value + operand;
            break;
          case 'subtract':
            result = value - operand;
            break;
          case 'multiply':
            result = value * operand;
            break;
          case 'divide':
            result = operand !== 0 ? value / operand : 0;
            break;
          case 'power':
            result = Math.pow(value, operand);
            break;
          case 'mod':
            result = value % operand;
            break;
          case 'percentage':
            result = (value * operand) / 100;
            break;
          case 'sqrt':
            result = Math.sqrt(value);
            break;
          case 'abs':
            result = Math.abs(value);
            break;
          case 'round':
            const factor = Math.pow(10, decimals);
            result = Math.round(value * factor) / factor;
            break;
          case 'floor':
            result = Math.floor(value);
            break;
          case 'ceil':
            result = Math.ceil(value);
            break;
          default:
            result = value;
        }

        return result;
      };

      const output = items.map(item => {
        let newItem = { ...item, json: { ...item.json } };

        if (mode === 'single') {
          const field = context.getNodeParameter('field', 'value') as string;
          const operation = context.getNodeParameter('operation', 'add') as string;
          const operand = context.getNodeParameter('operand', 0) as number;
          const decimals = context.getNodeParameter('decimals', 2) as number;

          const value = Number(getValue(item.json, field)) || 0;

          let result: number;

          if (['min', 'max', 'sum', 'avg'].includes(operation)) {
            // These operations work on arrays
            const arr = Array.isArray(value) ? value : [value];
            const nums = arr.map(v => Number(v) || 0);

            switch (operation) {
              case 'min':
                result = Math.min(...nums);
                break;
              case 'max':
                result = Math.max(...nums);
                break;
              case 'sum':
                result = nums.reduce((a, b) => a + b, 0);
                break;
              case 'avg':
                result = nums.length > 0 ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
                break;
              default:
                result = value;
            }
          } else {
            result = applyOperation(value, operation, operand, decimals);
          }

          newItem.json = setValue(newItem.json, outputField, result);

        } else if (mode === 'expression') {
          const expression = context.getNodeParameter('expression', '0') as string;

          // Validate expression for security
          const validation = validateExpression(expression);
          if (!validation.valid) {
            newItem.json = setValue(newItem.json, outputField, null);
            newItem.json = setValue(newItem.json, `${outputField}Error`, validation.error);
            return newItem;
          }

          // Build context with all fields as variables
          const vars = { ...item.json };

          try {
            // Create safe function with variables in scope
            const varNames = Object.keys(vars);
            const varValues = Object.values(vars);
            const fn = new Function(...varNames, `"use strict"; return (${expression})`);
            const result = fn(...varValues);
            newItem.json = setValue(newItem.json, outputField, Number(result) || 0);
          } catch (e) {
            newItem.json = setValue(newItem.json, outputField, null);
            newItem.json = setValue(newItem.json, `${outputField}Error`, 'Invalid expression');
          }

        } else if (mode === 'multiple') {
          const operations = context.getNodeParameter('operations', []) as Array<{
            field: string;
            operation: string;
            operand?: number;
            outputField: string;
          }>;

          for (const op of operations) {
            const value = Number(getValue(item.json, op.field)) || 0;
            const result = applyOperation(value, op.operation, op.operand || 0);
            newItem.json = setValue(newItem.json, op.outputField, result);
          }
        }

        return newItem;
      });

      return {
        success: true,
        output
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
