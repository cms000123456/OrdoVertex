import axios, { AxiosRequestConfig, Method } from 'axios';
import { PrismaClient } from '@prisma/client';
import { NodeType } from '../../types';
import { decryptJSON } from '../../utils/encryption';
import { isInternalUrl } from '../../utils/security';

const prisma = new PrismaClient();

export const httpRequestNode: NodeType = {
  name: 'httpRequest',
  displayName: 'HTTP Request',
  description: 'Make HTTP requests to external APIs',
  icon: 'fa:globe',
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
      name: 'output',
      type: 'all',
      description: 'HTTP response'
    }
  ],
  properties: [
    {
      name: 'method',
      displayName: 'Method',
      type: 'options',
      options: [
        { name: 'GET', value: 'GET' },
        { name: 'POST', value: 'POST' },
        { name: 'PUT', value: 'PUT' },
        { name: 'DELETE', value: 'DELETE' },
        { name: 'PATCH', value: 'PATCH' },
        { name: 'HEAD', value: 'HEAD' },
        { name: 'OPTIONS', value: 'OPTIONS' }
      ],
      default: 'GET',
      description: 'HTTP method'
    },
    {
      name: 'url',
      displayName: 'URL',
      type: 'string',
      required: true,
      placeholder: 'https://api.example.com/data',
      description: 'The URL to make the request to'
    },
    {
      name: 'authentication',
      displayName: 'Authentication',
      type: 'options',
      options: [
        { name: 'None', value: 'none' },
        { name: 'Basic Auth', value: 'basicAuth' },
        { name: 'Header Auth', value: 'headerAuth' },
        { name: 'OAuth2', value: 'oAuth2' },
        { name: 'Use Credential', value: 'credential' }
      ],
      default: 'none',
      description: 'Authentication method'
    },
    // Basic Auth fields
    {
      name: 'basicAuthUsername',
      displayName: 'Username',
      type: 'string',
      required: true,
      displayOptions: {
        show: {
          authentication: ['basicAuth']
        }
      }
    },
    {
      name: 'basicAuthPassword',
      displayName: 'Password',
      type: 'string',
      required: true,
      displayOptions: {
        show: {
          authentication: ['basicAuth']
        }
      }
    },
    // Header Auth fields
    {
      name: 'headerAuthName',
      displayName: 'Header Name',
      type: 'string',
      default: 'Authorization',
      required: true,
      displayOptions: {
        show: {
          authentication: ['headerAuth']
        }
      }
    },
    {
      name: 'headerAuthValue',
      displayName: 'Header Value',
      type: 'string',
      required: true,
      placeholder: 'Bearer token123',
      displayOptions: {
        show: {
          authentication: ['headerAuth']
        }
      }
    },
    // OAuth2 fields
    {
      name: 'oAuth2AccessToken',
      displayName: 'Access Token',
      type: 'string',
      required: true,
      displayOptions: {
        show: {
          authentication: ['oAuth2']
        }
      }
    },
    // Credential selector
    {
      name: 'useCredential',
      displayName: 'Use Credential',
      type: 'boolean',
      default: false,
      description: 'Use a saved credential instead of manual authentication'
    },
    {
      name: 'credentialId',
      displayName: 'Credential',
      type: 'resource',
      resourceType: 'credential',
      required: true,
      description: 'Select a saved credential',
      displayOptions: {
        show: {
          useCredential: [true]
        }
      }
    },
    {
      name: 'sendHeaders',
      displayName: 'Send Headers',
      type: 'boolean',
      default: false,
      description: 'Whether to send custom headers'
    },
    {
      name: 'headerParameters',
      displayName: 'Headers',
      type: 'json',
      default: {},
      description: 'Custom headers to send (JSON object)',
      displayOptions: {
        show: {
          sendHeaders: [true]
        }
      }
    },
    {
      name: 'sendBody',
      displayName: 'Send Body',
      type: 'boolean',
      default: false,
      description: 'Whether to send a request body',
      displayOptions: {
        show: {
          method: ['POST', 'PUT', 'PATCH']
        }
      }
    },
    {
      name: 'contentType',
      displayName: 'Content Type',
      type: 'options',
      options: [
        { name: 'JSON', value: 'json' },
        { name: 'Form Data', value: 'form' },
        { name: 'Form URL-encoded', value: 'urlencoded' },
        { name: 'Raw', value: 'raw' }
      ],
      default: 'json',
      description: 'Content type of the body',
      displayOptions: {
        show: {
          sendBody: [true],
          method: ['POST', 'PUT', 'PATCH']
        }
      }
    },
    {
      name: 'body',
      displayName: 'Body',
      type: 'multiline',
      placeholder: '{ "key": "value" }',
      description: 'Request body',
      displayOptions: {
        show: {
          sendBody: [true],
          method: ['POST', 'PUT', 'PATCH']
        }
      }
    },
    {
      name: 'options',
      displayName: 'Options',
      type: 'json',
      default: {},
      description: 'Additional axios options (timeout, etc.)'
    },
    {
      name: 'allowUnauthorizedCerts',
      displayName: 'Allow Unauthorized Certs',
      type: 'boolean',
      default: false,
      description: 'Allow connections to servers with self-signed certificates'
    }
  ],
  execute: async (context) => {
    try {
      const method = context.getNodeParameter('method', 'GET') as string;
      const url = context.getNodeParameter('url', '') as string;
      const authentication = context.getNodeParameter('authentication', 'none') as string;
      const sendHeaders = context.getNodeParameter('sendHeaders', false) as boolean;
      const sendBody = context.getNodeParameter('sendBody', false) as boolean;
      const contentType = context.getNodeParameter('contentType', 'json') as string;
      const options = context.getNodeParameter('options', {}) as Record<string, any>;
      const allowUnauthorizedCerts = context.getNodeParameter('allowUnauthorizedCerts', false) as boolean;
      const useCredential = context.getNodeParameter('useCredential', false) as boolean;
      
      if (!url) {
        throw new Error('URL is required');
      }
      
      // Log the actual URL being called for debugging
      console.log(`[HTTP Request] ${method} ${url}`);

      // SSRF Protection - Block internal URLs
      if (isInternalUrl(url)) {
        throw new Error('Access to internal addresses and cloud metadata services is not allowed');
      }

      const config: AxiosRequestConfig = {
        method: method as Method,
        url,
        httpsAgent: allowUnauthorizedCerts ? { rejectUnauthorized: false } : undefined,
        // Default to text response to handle various APIs
        responseType: 'text',
        // Prevent SSRF bypass via redirects
        maxRedirects: 0,
        // Apply user options
        ...options
      };
      
      // Ensure headers are merged properly
      if (options.headers) {
        config.headers = { ...config.headers, ...options.headers };
      }

      // Load credential if enabled
      let credentialData: Record<string, any> | null = null;
      if (useCredential) {
        const credentialId = context.getNodeParameter('credentialId', '') as string;
        if (credentialId) {
          try {
            const credential = await prisma.credential.findFirst({
              where: { 
                id: credentialId,
                userId: context.userId
              }
            });

            if (credential) {
              // Update last used timestamp
              await prisma.credential.update({
                where: { id: credentialId },
                data: { lastUsed: new Date() }
              });

              credentialData = decryptJSON(credential.data, credential.iv);
            }
          } catch (error) {
            console.error('Error loading credential:', error);
          }
        }
      }

      // Handle authentication
      if (useCredential && credentialData) {
        // Apply credential data based on credential type
        const credType = credentialData.type || 'generic';
        
        if (credType === 'http' || (credentialData.username && credentialData.password)) {
          // Basic auth from credential
          config.auth = {
            username: credentialData.username || credentialData.user,
            password: credentialData.password
          };
        } else if (credType === 'apiKey' || credentialData.key) {
          // API Key from credential
          const headerName = credentialData.headerName || 'X-API-Key';
          config.headers = { ...config.headers, [headerName]: credentialData.key };
        } else if (credType === 'oauth2' || credentialData.accessToken) {
          // OAuth2 from credential
          config.headers = { 
            ...config.headers, 
            'Authorization': `Bearer ${credentialData.accessToken}` 
          };
        } else {
          // Generic credentials - try to use as headers
          Object.entries(credentialData).forEach(([key, value]) => {
            if (key !== 'type' && typeof value === 'string') {
              config.headers = { ...config.headers, [key]: value };
            }
          });
        }
      } else {
        // Manual authentication
        switch (authentication) {
          case 'basicAuth': {
            const username = context.getNodeParameter('basicAuthUsername', '') as string;
            const password = context.getNodeParameter('basicAuthPassword', '') as string;
            config.auth = { username, password };
            break;
          }
          case 'headerAuth': {
            const headerName = context.getNodeParameter('headerAuthName', 'Authorization') as string;
            const headerValue = context.getNodeParameter('headerAuthValue', '') as string;
            config.headers = { ...config.headers, [headerName]: headerValue };
            break;
          }
          case 'oAuth2': {
            const accessToken = context.getNodeParameter('oAuth2AccessToken', '') as string;
            config.headers = { ...config.headers, 'Authorization': `Bearer ${accessToken}` };
            break;
          }
        }
      }

      if (sendHeaders) {
        const headerParameters = context.getNodeParameter('headerParameters', {}) as Record<string, string>;
        config.headers = { ...config.headers, ...headerParameters };
      }

      if (sendBody && ['POST', 'PUT', 'PATCH'].includes(method)) {
        const body = context.getNodeParameter('body', '') as string;
        
        if (contentType === 'json') {
          config.headers = { ...config.headers, 'Content-Type': 'application/json' };
          try {
            config.data = JSON.parse(body);
          } catch (e) {
            config.data = body;
          }
        } else if (contentType === 'form') {
          config.headers = { ...config.headers, 'Content-Type': 'multipart/form-data' };
          config.data = body;
        } else if (contentType === 'urlencoded') {
          config.headers = { ...config.headers, 'Content-Type': 'application/x-www-form-urlencoded' };
          config.data = body;
        } else {
          config.data = body;
        }
      }

      const response = await axios(config);
      
      let responseBody = response.data;
      
      // Try to parse JSON if response is a string that looks like JSON
      if (typeof responseBody === 'string') {
        const contentType = String(response.headers['content-type'] || '');
        if (contentType.includes('json') || responseBody.trim().startsWith('{') || responseBody.trim().startsWith('[')) {
          try {
            responseBody = JSON.parse(responseBody);
          } catch (e) {
            // Keep as string if parsing fails
          }
        }
      }
      
      // Handle empty responses
      if (!responseBody || (typeof responseBody === 'string' && responseBody.trim() === '')) {
        return {
          success: true,
          output: [{
            json: {
              statusCode: response.status,
              statusMessage: response.statusText,
              headers: response.headers,
              body: null,
              warning: 'Empty response received'
            }
          }]
        };
      }

      return {
        success: true,
        output: [{
          json: {
            statusCode: response.status,
            statusMessage: response.statusText,
            url: url,
            headers: response.headers,
            body: responseBody
          }
        }]
      };
    } catch (error: any) {
      if (context.continueOnFail()) {
        return {
          success: true,
          output: [{
            json: {
              error: error.message,
              response: error.response?.data,
              statusCode: error.response?.status
            }
          }]
        };
      }
      throw error;
    }
  }
};
