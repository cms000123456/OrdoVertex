import { NodeType } from '../../types';

export const webhookResponseNode: NodeType = {
  name: 'webhookResponse',
  displayName: 'Webhook Response',
  description: 'Return a custom HTTP response for webhook triggers',
  icon: 'fa:reply',
  category: 'Actions',
  version: 1,
  inputs: [
    {
      name: 'input',
      type: 'all',
      description: 'Input data for response'
    }
  ],
  outputs: [
    {
      name: 'output',
      type: 'all',
      description: 'Response configuration'
    }
  ],
  properties: [
    {
      name: 'statusCode',
      displayName: 'Status Code',
      type: 'options',
      options: [
        { name: '200 OK', value: 200 },
        { name: '201 Created', value: 201 },
        { name: '204 No Content', value: 204 },
        { name: '400 Bad Request', value: 400 },
        { name: '401 Unauthorized', value: 401 },
        { name: '403 Forbidden', value: 403 },
        { name: '404 Not Found', value: 404 },
        { name: '500 Server Error', value: 500 }
      ],
      default: 200,
      description: 'HTTP status code'
    },
    {
      name: 'contentType',
      displayName: 'Content Type',
      type: 'options',
      options: [
        { name: 'JSON', value: 'application/json' },
        { name: 'Plain Text', value: 'text/plain' },
        { name: 'HTML', value: 'text/html' },
        { name: 'XML', value: 'application/xml' },
        { name: 'Custom', value: 'custom' }
      ],
      default: 'application/json'
    },
    {
      name: 'customContentType',
      displayName: 'Custom Content Type',
      type: 'string',
      default: '',
      displayOptions: {
        show: {
          contentType: ['custom']
        }
      }
    },
    {
      name: 'responseMode',
      displayName: 'Response Body',
      type: 'options',
      options: [
        { name: 'JSON Data', value: 'json' },
        { name: 'Text', value: 'text' },
        { name: 'First Input Item', value: 'firstItem' },
        { name: 'All Items', value: 'allItems' },
        { name: 'Custom', value: 'custom' }
      ],
      default: 'json'
    },
    {
      name: 'responseBody',
      displayName: 'Response Body',
      type: 'multiline',
      default: '{\n  "success": true,\n  "message": "Processed successfully"\n}',
      displayOptions: {
        show: {
          responseMode: ['text', 'custom']
        }
      }
    },
    {
      name: 'jsonData',
      displayName: 'JSON Data',
      type: 'json',
      default: {
        success: true,
        data: '{{ $input }}'
      },
      description: 'JSON object to return',
      displayOptions: {
        show: {
          responseMode: ['json']
        }
      }
    },
    {
      name: 'headers',
      displayName: 'Headers',
      type: 'json',
      default: {},
      description: 'Additional HTTP headers'
    },
    {
      name: 'cookies',
      displayName: 'Cookies',
      type: 'json',
      default: [],
      description: 'Array of {name, value, options} cookies to set'
    }
  ],
  execute: async (context) => {
    try {
      const statusCode = context.getNodeParameter('statusCode', 200) as number;
      const contentType = context.getNodeParameter('contentType', 'application/json') as string;
      const customContentType = context.getNodeParameter('customContentType', '') as string;
      const responseMode = context.getNodeParameter('responseMode', 'json') as string;
      const responseBody = context.getNodeParameter('responseBody', '') as string;
      const jsonData = context.getNodeParameter('jsonData', {}) as any;
      const headers = context.getNodeParameter('headers', {}) as Record<string, string>;
      const cookies = context.getNodeParameter('cookies', []) as any[];
      
      const items = context.getInputData();
      const item = items[0]?.json || {};

      // Build response
      const finalContentType = contentType === 'custom' ? customContentType : contentType;
      
      let body: any;
      
      switch (responseMode) {
        case 'json':
          // Replace template variables in JSON
          const jsonStr = JSON.stringify(jsonData);
          const replaced = jsonStr.replace(/\{\{\s*\$input\.?(\w*)\s*\}\}/g, (_, key) => {
            if (!key) return JSON.stringify(item);
            return JSON.stringify(item[key] ?? null);
          });
          body = JSON.parse(replaced);
          break;
          
        case 'text':
        case 'custom':
          body = responseBody.replace(/\{\{\s*\$input\.(\w+)\s*\}\}/g, (_, key) => {
            return String(item[key] ?? '');
          });
          break;
          
        case 'firstItem':
          body = item;
          break;
          
        case 'allItems':
          body = items.map(i => i.json);
          break;
          
        default:
          body = { success: true };
      }

      const response: any = {
        statusCode,
        contentType: finalContentType,
        body,
        headers: {
          'Content-Type': finalContentType,
          ...headers
        }
      };

      if (cookies && cookies.length > 0) {
        response.cookies = cookies;
      }

      // Mark as webhook response for the execution engine
      response.__webhookResponse = true;

      return {
        success: true,
        output: [{
          json: response
        }]
      };
    } catch (error: any) {
      if (context.continueOnFail()) {
        return {
          success: true,
          output: [{
            json: {
              error: error.message,
              statusCode: 500,
              body: { error: 'Internal server error' }
            }
          }]
        };
      }
      throw error;
    }
  }
};
