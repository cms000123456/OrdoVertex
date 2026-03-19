import { NodeType } from '../../types';

export const webhookNode: NodeType = {
  name: 'webhook',
  displayName: 'Webhook',
  description: 'Trigger workflow via HTTP webhook',
  icon: 'fa:globe',
  category: 'Triggers',
  version: 1,
  inputs: [],
  outputs: [
    {
      name: 'output',
      type: 'all',
      description: 'Webhook data'
    }
  ],
  properties: [
    {
      name: 'httpMethod',
      displayName: 'HTTP Method',
      type: 'options',
      options: [
        { name: 'GET', value: 'GET' },
        { name: 'POST', value: 'POST' },
        { name: 'PUT', value: 'PUT' },
        { name: 'DELETE', value: 'DELETE' },
        { name: 'PATCH', value: 'PATCH' }
      ],
      default: 'POST',
      description: 'The HTTP method to listen for'
    },
    {
      name: 'path',
      displayName: 'Path',
      type: 'string',
      default: '',
      placeholder: 'webhook-endpoint',
      description: 'The path to listen on (e.g., /webhook/your-path)'
    },
    {
      name: 'responseMode',
      displayName: 'Response Mode',
      type: 'options',
      options: [
        { name: 'On Received', value: 'onReceived', description: 'Respond immediately when webhook is received' },
        { name: 'Last Node', value: 'lastNode', description: 'Respond with the last node\'s output' }
      ],
      default: 'onReceived',
      description: 'When to send the response'
    },
    {
      name: 'responseCode',
      displayName: 'Response Code',
      type: 'number',
      default: 200,
      description: 'HTTP response code'
    },
    {
      name: 'responseData',
      displayName: 'Response Data',
      type: 'multiline',
      default: '{"success": true}',
      description: 'Response body (JSON)',
      displayOptions: {
        show: {
          responseMode: ['onReceived']
        }
      }
    }
  ],
  execute: async (context) => {
    const items = context.getInputData();
    
    // Webhook trigger returns the incoming webhook data
    return {
      success: true,
      output: items.length > 0 ? items : [{ json: {} }]
    };
  }
};
