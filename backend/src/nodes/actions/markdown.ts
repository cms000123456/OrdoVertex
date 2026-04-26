import { NodeType } from '../../types';
import { getErrorMessage } from '../../utils/error-helper';

export const markdownNode: NodeType = {
  name: 'markdown',
  displayName: 'Format to Markdown',
  description: 'Format input data as Markdown',
  icon: 'fa:file-lines',
  category: 'Transform',
  version: 1,
  inputs: [
    {
      name: 'input',
      type: 'all',
      description: 'Input data to format'
    }
  ],
  outputs: [
    {
      name: 'output',
      type: 'all',
      description: 'Markdown formatted output'
    }
  ],
  properties: [
    {
      name: 'format',
      displayName: 'Format',
      type: 'options',
      options: [
        { name: 'Auto-detect', value: 'auto' },
        { name: 'Table', value: 'table' },
        { name: 'Bullet List', value: 'bulletList' },
        { name: 'Numbered List', value: 'numberedList' },
        { name: 'Heading', value: 'heading' },
        { name: 'Code Block', value: 'codeBlock' },
        { name: 'Quote Block', value: 'quote' },
        { name: 'Horizontal Rule', value: 'hr' }
      ],
      default: 'auto',
      description: 'Markdown format to use'
    },
    {
      name: 'headingLevel',
      displayName: 'Heading Level',
      type: 'options',
      options: [
        { name: 'H1', value: '1' },
        { name: 'H2', value: '2' },
        { name: 'H3', value: '3' },
        { name: 'H4', value: '4' },
        { name: 'H5', value: '5' },
        { name: 'H6', value: '6' }
      ],
      default: '2',
      description: 'Heading level (1-6)',
      displayOptions: {
        show: {
          format: ['heading']
        }
      }
    },
    {
      name: 'headingText',
      displayName: 'Heading Text',
      type: 'string',
      default: '',
      description: 'Text for the heading (leave empty to use input)',
      displayOptions: {
        show: {
          format: ['heading']
        }
      }
    },
    {
      name: 'codeLanguage',
      displayName: 'Language',
      type: 'string',
      default: 'json',
      description: 'Code block language tag',
      displayOptions: {
        show: {
          format: ['codeBlock']
        }
      }
    },
    {
      name: 'fieldName',
      displayName: 'Field Name',
      type: 'string',
      default: '',
      description: 'Input field to format (leave empty to use entire input)'
    }
  ],
  execute: async (context) => {
    try {
      const format = context.getNodeParameter('format', 'auto') as string;
      const fieldName = context.getNodeParameter('fieldName', '') as string;
      const items = context.getInputData();
      const inputData = items[0]?.json || {};

      // If upstream provided a _display hint with markdown content, use it directly
      const displayContent = inputData._display?.content;
      if (displayContent && typeof displayContent === 'string' && !fieldName) {
        return {
          success: true,
          output: [{
            json: {
              markdown: displayContent,
              format: 'markdown',
              _display: {
                type: 'markdown',
                content: displayContent
              }
            }
          }]
        };
      }

      let data = fieldName ? (inputData[fieldName] ?? inputData) : inputData;

      // If no fieldName specified and data is a plain object, try to extract
      // a string value from common text fields before falling back to JSON
      if (!fieldName && typeof data === 'object' && data !== null && !Array.isArray(data)) {
        const textFields = ['response', 'text', 'message', 'content', 'markdown'];
        for (const key of textFields) {
          if (typeof data[key] === 'string' && data[key].length > 0) {
            data = data[key];
            break;
          }
        }
      }

      let markdown = '';
      const resolvedFormat = format === 'auto' ? detectFormat(data) : format;

      switch (resolvedFormat) {
        case 'table':
          markdown = formatAsTable(data);
          break;
        case 'bulletList':
          markdown = formatAsList(data, 'bullet');
          break;
        case 'numberedList':
          markdown = formatAsList(data, 'numbered');
          break;
        case 'heading':
          const level = context.getNodeParameter('headingLevel', '2') as string;
          const headingText = context.getNodeParameter('headingText', '') as string;
          markdown = `${'#'.repeat(parseInt(level))} ${headingText || String(data)}`;
          break;
        case 'codeBlock':
          const lang = context.getNodeParameter('codeLanguage', 'json') as string;
          const code = typeof data === 'object' ? JSON.stringify(data, null, 2) : String(data);
          markdown = '```' + lang + '\n' + code + '\n```';
          break;
        case 'quote':
          const quoteText = typeof data === 'object' ? JSON.stringify(data, null, 2) : String(data);
          markdown = quoteText.split('\n').map((line: string) => '> ' + line).join('\n');
          break;
        case 'hr':
          markdown = '---';
          break;
        default:
          markdown = typeof data === 'object' ? JSON.stringify(data, null, 2) : String(data);
      }

      return {
        success: true,
        output: [{
          json: {
            markdown,
            format: resolvedFormat,
            _display: {
              type: 'markdown',
              content: markdown
            }
          }
        }]
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

function detectFormat(data: any): string {
  if (Array.isArray(data) && data.length > 0) {
    if (typeof data[0] === 'object') {
      return 'table';
    }
    return 'bulletList';
  }
  if (typeof data === 'object') {
    return 'codeBlock';
  }
  return 'quote';
}

function formatAsTable(data: any): string {
  if (!Array.isArray(data) || data.length === 0) {
    return '| Value |\n|-------|\n| ' + String(data) + ' |';
  }

  // Normalize to array of objects
  const rows = data.map((item: any) =>
    typeof item === 'object' && item !== null ? item : { value: item }
  );

  const keys = Array.from(new Set(rows.flatMap((r: any) => Object.keys(r))));

  if (keys.length === 0) {
    return '| (empty) |\n|---------|';
  }

  const header = '| ' + keys.join(' | ') + ' |';
  const separator = '| ' + keys.map(() => '---').join(' | ') + ' |';
  const body = rows.map((row: any) =>
    '| ' + keys.map((k: string) => {
      const val = row[k];
      if (val === undefined || val === null) return '';
      const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
      return str.replace(/\|/g, '\\|').replace(/\n/g, ' ');
    }).join(' | ') + ' |'
  ).join('\n');

  return [header, separator, body].join('\n');
}

function formatAsList(data: any, type: 'bullet' | 'numbered'): string {
  if (!Array.isArray(data)) {
    data = [data];
  }

  return data.map((item: any, index: number) => {
    const prefix = type === 'numbered' ? `${index + 1}.` : '-';
    const text = typeof item === 'object' && item !== null
      ? JSON.stringify(item)
      : String(item);
    return `${prefix} ${text}`;
  }).join('\n');
}
