import { NodeType } from '../../types';
import { getErrorMessage } from '../../utils/error-helper';

export const stringOpsNode: NodeType = {
  name: 'stringOps',
  displayName: 'String Operations',
  description: 'Transform strings with common operations',
  icon: 'fa:font',
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
      description: 'Output with transformed strings'
    }
  ],
  properties: [
    {
      name: 'operations',
      displayName: 'Operations',
      type: 'json',
      default: [
        { field: 'name', operation: 'trim', outputField: 'name_clean' }
      ],
      description: 'Array of {field, operation, outputField, options} operations'
    },
    {
      name: 'mode',
      displayName: 'Mode',
      type: 'options',
      options: [
        { name: 'Simple (Single Operation)', value: 'simple' },
        { name: 'Advanced (Multiple Operations)', value: 'advanced' }
      ],
      default: 'simple',
      description: 'Configuration mode'
    },
    {
      name: 'field',
      displayName: 'Field',
      type: 'string',
      default: 'text',
      description: 'Field to transform',
      displayOptions: {
        show: {
          mode: ['simple']
        }
      }
    },
    {
      name: 'operation',
      displayName: 'Operation',
      type: 'options',
      options: [
        { name: 'Trim', value: 'trim' },
        { name: 'Uppercase', value: 'uppercase' },
        { name: 'Lowercase', value: 'lowercase' },
        { name: 'Capitalize', value: 'capitalize' },
        { name: 'Title Case', value: 'titleCase' },
        { name: 'Camel Case', value: 'camelCase' },
        { name: 'Snake Case', value: 'snakeCase' },
        { name: 'Kebab Case', value: 'kebabCase' },
        { name: 'Replace', value: 'replace' },
        { name: 'Replace All', value: 'replaceAll' },
        { name: 'Extract Regex', value: 'extract' },
        { name: 'Remove HTML', value: 'stripHtml' },
        { name: 'URL Encode', value: 'urlEncode' },
        { name: 'URL Decode', value: 'urlDecode' },
        { name: 'Base64 Encode', value: 'base64Encode' },
        { name: 'Base64 Decode', value: 'base64Decode' },
        { name: 'Truncate', value: 'truncate' },
        { name: 'Pad Start', value: 'padStart' },
        { name: 'Pad End', value: 'padEnd' },
        { name: 'Reverse', value: 'reverse' }
      ],
      default: 'trim',
      description: 'String operation to perform',
      displayOptions: {
        show: {
          mode: ['simple']
        }
      }
    },
    {
      name: 'outputField',
      displayName: 'Output Field',
      type: 'string',
      default: 'result',
      description: 'Field to store result',
      displayOptions: {
        show: {
          mode: ['simple']
        }
      }
    },
    {
      name: 'searchValue',
      displayName: 'Search Value',
      type: 'string',
      default: '',
      description: 'Text to search for',
      displayOptions: {
        show: {
          mode: ['simple'],
          operation: ['replace', 'replaceAll']
        }
      }
    },
    {
      name: 'replaceValue',
      displayName: 'Replace Value',
      type: 'string',
      default: '',
      description: 'Text to replace with',
      displayOptions: {
        show: {
          mode: ['simple'],
          operation: ['replace', 'replaceAll']
        }
      }
    },
    {
      name: 'regexPattern',
      displayName: 'Regex Pattern',
      type: 'string',
      default: '',
      description: 'Regular expression pattern',
      displayOptions: {
        show: {
          mode: ['simple'],
          operation: ['extract']
        }
      }
    },
    {
      name: 'maxLength',
      displayName: 'Max Length',
      type: 'number',
      default: 100,
      description: 'Maximum string length',
      displayOptions: {
        show: {
          mode: ['simple'],
          operation: ['truncate']
        }
      }
    },
    {
      name: 'padChar',
      displayName: 'Pad Character',
      type: 'string',
      default: ' ',
      description: 'Character to pad with',
      displayOptions: {
        show: {
          mode: ['simple'],
          operation: ['padStart', 'padEnd']
        }
      }
    },
    {
      name: 'padLength',
      displayName: 'Pad Length',
      type: 'number',
      default: 10,
      description: 'Target length after padding',
      displayOptions: {
        show: {
          mode: ['simple'],
          operation: ['padStart', 'padEnd']
        }
      }
    }
  ],
  execute: async (context) => {
    try {
      const mode = context.getNodeParameter('mode', 'simple') as string;
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

      const applyOperation = (value: any, operation: string, options: any = {}) => {
        if (value == null) return null;
        let str = String(value);

        switch (operation) {
          case 'trim':
            return str.trim();
          case 'uppercase':
            return str.toUpperCase();
          case 'lowercase':
            return str.toLowerCase();
          case 'capitalize':
            return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
          case 'titleCase':
            return str.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase());
          case 'camelCase':
            return str
              .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => index === 0 ? word.toLowerCase() : word.toUpperCase())
              .replace(/\s+/g, '');
          case 'snakeCase':
            return str.replace(/\s+/g, '_').toLowerCase();
          case 'kebabCase':
            return str.replace(/\s+/g, '-').toLowerCase();
          case 'replace':
            return str.replace(options.searchValue, options.replaceValue);
          case 'replaceAll':
            return str.split(options.searchValue).join(options.replaceValue);
          case 'extract':
            const match = str.match(new RegExp(options.regexPattern));
            return match ? match[0] : null;
          case 'stripHtml':
            return str.replace(/<[^>]*>/g, '');
          case 'urlEncode':
            return encodeURIComponent(str);
          case 'urlDecode':
            return decodeURIComponent(str);
          case 'base64Encode':
            return Buffer.from(str).toString('base64');
          case 'base64Decode':
            return Buffer.from(str, 'base64').toString('utf8');
          case 'truncate':
            if (str.length <= options.maxLength) return str;
            return str.slice(0, options.maxLength) + '...';
          case 'padStart':
            return str.padStart(options.padLength, options.padChar);
          case 'padEnd':
            return str.padEnd(options.padLength, options.padChar);
          case 'reverse':
            return str.split('').reverse().join('');
          default:
            return str;
        }
      };

      const output = items.map(item => {
        let newItem = { ...item, json: { ...item.json } };

        if (mode === 'simple') {
          const field = context.getNodeParameter('field', 'text') as string;
          const operation = context.getNodeParameter('operation', 'trim') as string;
          const outputField = context.getNodeParameter('outputField', 'result') as string;

          const value = getValue(item.json, field);
          const options: any = {};

          if (operation === 'replace' || operation === 'replaceAll') {
            options.searchValue = context.getNodeParameter('searchValue', '') as string;
            options.replaceValue = context.getNodeParameter('replaceValue', '') as string;
          }
          if (operation === 'extract') {
            options.regexPattern = context.getNodeParameter('regexPattern', '') as string;
          }
          if (operation === 'truncate') {
            options.maxLength = context.getNodeParameter('maxLength', 100) as number;
          }
          if (operation === 'padStart' || operation === 'padEnd') {
            options.padChar = context.getNodeParameter('padChar', ' ') as string;
            options.padLength = context.getNodeParameter('padLength', 10) as number;
          }

          const result = applyOperation(value, operation, options);
          newItem.json = setValue(newItem.json, outputField, result);
        } else {
          const operations = context.getNodeParameter('operations', []) as Array<{
            field: string;
            operation: string;
            outputField: string;
            options?: any;
          }>;

          for (const op of operations) {
            const value = getValue(item.json, op.field);
            const result = applyOperation(value, op.operation, op.options || {});
            newItem.json = setValue(newItem.json, op.outputField, result);
          }
        }

        return newItem;
      });

      return {
        success: true,
        output
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
