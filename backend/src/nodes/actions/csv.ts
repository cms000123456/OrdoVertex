import { NodeType } from '../../types';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';

export const csvNode: NodeType = {
  name: 'csv',
  displayName: 'CSV',
  description: 'Parse or generate CSV files',
  icon: 'fa:file-csv',
  category: 'Transform',
  version: 1,
  inputs: [
    {
      name: 'input',
      type: 'all',
      description: 'Input data or CSV content'
    }
  ],
  outputs: [
    {
      name: 'output',
      type: 'all',
      description: 'Parsed data or CSV string'
    }
  ],
  properties: [
    {
      name: 'operation',
      displayName: 'Operation',
      type: 'options',
      options: [
        { name: 'Parse CSV to JSON', value: 'parse' },
        { name: 'Generate CSV from JSON', value: 'generate' }
      ],
      default: 'parse',
      description: 'Convert CSV to JSON or vice versa'
    },
    {
      name: 'inputField',
      displayName: 'Input Field',
      type: 'string',
      default: 'data',
      description: 'Field containing CSV text or file content'
    },
    {
      name: 'outputField',
      displayName: 'Output Field',
      type: 'string',
      default: 'result',
      description: 'Field to store the result'
    },
    {
      name: 'delimiter',
      displayName: 'Delimiter',
      type: 'options',
      options: [
        { name: 'Comma (,)', value: ',' },
        { name: 'Semicolon (;)', value: ';' },
        { name: 'Tab', value: '\t' },
        { name: 'Pipe (|)', value: '|' },
        { name: 'Custom', value: 'custom' }
      ],
      default: ','
    },
    {
      name: 'customDelimiter',
      displayName: 'Custom Delimiter',
      type: 'string',
      default: '',
      displayOptions: {
        show: {
          delimiter: ['custom']
        }
      }
    },
    {
      name: 'header',
      displayName: 'Header Row',
      type: 'boolean',
      default: true,
      description: 'First row contains column names'
    },
    {
      name: 'columns',
      displayName: 'Columns',
      type: 'json',
      default: [],
      description: 'Column names (if no header, or to override)',
      displayOptions: {
        show: {
          operation: ['parse']
        }
      }
    },
    {
      name: 'skipEmpty',
      displayName: 'Skip Empty Lines',
      type: 'boolean',
      default: true
    },
    {
      name: 'trim',
      displayName: 'Trim Whitespace',
      type: 'boolean',
      default: true
    },
    {
      name: 'includeHeader',
      displayName: 'Include Header',
      type: 'boolean',
      default: true,
      description: 'Include header row in output',
      displayOptions: {
        show: {
          operation: ['generate']
        }
      }
    },
    {
      name: 'bom',
      displayName: 'Add BOM',
      type: 'boolean',
      default: false,
      description: 'Add Byte Order Mark for Excel compatibility',
      displayOptions: {
        show: {
          operation: ['generate']
        }
      }
    }
  ],
  execute: async (context) => {
    try {
      const operation = context.getNodeParameter('operation', 'parse') as string;
      const inputField = context.getNodeParameter('inputField', 'data') as string;
      const outputField = context.getNodeParameter('outputField', 'result') as string;
      const delimiter = context.getNodeParameter('delimiter', ',') as string;
      const customDelimiter = context.getNodeParameter('customDelimiter', '') as string;
      const hasHeader = context.getNodeParameter('header', true) as boolean;
      const skipEmpty = context.getNodeParameter('skipEmpty', true) as boolean;
      const trimWhitespace = context.getNodeParameter('trim', true) as boolean;
      
      const items = context.getInputData();
      const sep = delimiter === 'custom' ? customDelimiter : delimiter;

      if (operation === 'parse') {
        const columns = context.getNodeParameter('columns', []) as string[];
        const csvContent = items[0]?.json?.[inputField] || items[0]?.json?.text || '';

        if (!csvContent) {
          throw new Error('No CSV content found');
        }

        const records = parse(csvContent, {
          delimiter: sep,
          columns: columns.length > 0 ? columns : hasHeader,
          skip_empty_lines: skipEmpty,
          trim: trimWhitespace,
          cast: true
        });

        return {
          success: true,
          output: records.map((record: any) => ({
            json: record
          }))
        };
      } else {
        // Generate CSV
        const includeHeader = context.getNodeParameter('includeHeader', true) as boolean;
        const addBom = context.getNodeParameter('bom', false) as boolean;
        
        const data = items.map(item => item.json);
        
        let csv = stringify(data, {
          delimiter: sep,
          header: includeHeader,
          columns: data.length > 0 ? Object.keys(data[0]) : undefined
        });

        if (addBom) {
          csv = '\ufeff' + csv;
        }

        return {
          success: true,
          output: [{
            json: {
              [outputField]: csv
            }
          }]
        };
      }
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
