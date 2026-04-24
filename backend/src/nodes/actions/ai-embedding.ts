import { NodeType } from '../../types';
import { getErrorMessage } from '../../utils/error-helper';
import { prisma } from '../../prisma';
import { decryptJSON } from '../../utils/encryption';
import OpenAI from 'openai';


export const aiEmbeddingNode: NodeType = {
  name: 'aiEmbedding',
  displayName: 'AI Embedding',
  description: 'Generate vector embeddings from text using AI models',
  icon: 'fa:vector-square',
  category: 'AI',
  version: 1,
  inputs: [
    {
      name: 'input',
      type: 'all',
      description: 'Text to embed'
    }
  ],
  outputs: [
    {
      name: 'output',
      type: 'all',
      description: 'Vector embedding'
    }
  ],
  properties: [
    {
      name: 'provider',
      displayName: 'Provider',
      type: 'options',
      options: [
        { name: 'OpenAI', value: 'openai' },
        { name: 'Kimi AI (Moonshot)', value: 'kimi' },
        { name: 'Ollama', value: 'ollama' }
      ],
      default: 'openai',
      description: 'Embedding provider'
    },
    {
      name: 'useCredential',
      displayName: 'Use Credential',
      type: 'boolean',
      default: true,
      description: 'Use saved API credentials'
    },
    {
      name: 'credentialId',
      displayName: 'API Credential',
      type: 'resource',
      resourceType: 'credential',
      required: true,
      displayOptions: {
        show: {
          useCredential: [true],
          provider: ['openai']
        }
      }
    },
    {
      name: 'apiKey',
      displayName: 'API Key',
      type: 'string',
      required: true,
      displayOptions: {
        show: {
          useCredential: [false],
          provider: ['openai']
        }
      }
    },
    {
      name: 'model',
      displayName: 'Model',
      type: 'options',
      options: [
        { name: 'text-embedding-3-small', value: 'text-embedding-3-small' },
        { name: 'text-embedding-3-large', value: 'text-embedding-3-large' },
        { name: 'text-embedding-ada-002', value: 'text-embedding-ada-002' }
      ],
      default: 'text-embedding-3-small',
      displayOptions: {
        show: {
          provider: ['openai']
        }
      }
    },
    {
      name: 'kimiCredentialId',
      displayName: 'API Credential',
      type: 'resource',
      resourceType: 'credential',
      required: true,
      displayOptions: {
        show: {
          useCredential: [true],
          provider: ['kimi']
        }
      }
    },
    {
      name: 'kimiApiKey',
      displayName: 'API Key',
      type: 'string',
      required: true,
      displayOptions: {
        show: {
          useCredential: [false],
          provider: ['kimi']
        }
      }
    },
    {
      name: 'kimiBaseUrl',
      displayName: 'Base URL',
      type: 'string',
      default: 'https://api.moonshot.cn/v1',
      displayOptions: {
        show: {
          provider: ['kimi']
        }
      }
    },
    {
      name: 'ollamaUrl',
      displayName: 'Ollama URL',
      type: 'string',
      default: 'http://localhost:11434',
      displayOptions: {
        show: {
          provider: ['ollama']
        }
      }
    },
    {
      name: 'ollamaModel',
      displayName: 'Ollama Model',
      type: 'string',
      default: 'nomic-embed-text',
      displayOptions: {
        show: {
          provider: ['ollama']
        }
      }
    },
    {
      name: 'inputField',
      displayName: 'Input Field',
      type: 'string',
      default: 'text',
      description: 'Field containing text to embed'
    }
  ],
  execute: async (context) => {
    try {
      const provider = context.getNodeParameter('provider', 'openai') as string;
      const useCredential = context.getNodeParameter('useCredential', true) as boolean;
      const inputField = context.getNodeParameter('inputField', 'text') as string;

      // Get input text
      const items = context.getInputData();
      const inputText = items[0]?.json?.[inputField] || items[0]?.json?.text || JSON.stringify(items[0]?.json);

      if (!inputText) {
        throw new Error('No input text provided');
      }

      let embedding: number[];

      if (provider === 'openai') {
        const model = context.getNodeParameter('model', 'text-embedding-3-small') as string;
        
        // Get API key
        let apiKey: string;
        if (useCredential) {
          const credentialId = context.getNodeParameter('credentialId', '') as string;
          const credential = await prisma.credential.findFirst({
            where: { deletedAt: null, id: credentialId, userId: context.userId }
          });
          if (!credential) throw new Error('Credential not found');
          const credData = decryptJSON(credential.data, credential.iv);
          apiKey = credData.apiKey || credData.key;
        } else {
          apiKey = context.getNodeParameter('apiKey', '') as string;
        }

        const openai = new OpenAI({ apiKey });
        const response = await openai.embeddings.create({
          model,
          input: inputText,
          encoding_format: 'float'
        });

        embedding = response.data[0].embedding;

      } else if (provider === 'kimi') {
        // Kimi AI uses OpenAI-compatible embedding API
        const kimiBaseUrl = context.getNodeParameter('kimiBaseUrl', 'https://api.moonshot.cn/v1') as string;
        
        // Get API key
        let apiKey: string;
        if (useCredential) {
          const credentialId = context.getNodeParameter('kimiCredentialId', '') as string;
          const credential = await prisma.credential.findFirst({
            where: { deletedAt: null, id: credentialId, userId: context.userId }
          });
          if (!credential) throw new Error('Credential not found');
          const credData = decryptJSON(credential.data, credential.iv);
          apiKey = credData.apiKey || credData.key;
        } else {
          apiKey = context.getNodeParameter('kimiApiKey', '') as string;
        }

        const kimi = new OpenAI({
          apiKey,
          baseURL: kimiBaseUrl
        });

        const response = await kimi.embeddings.create({
          model: 'moonshot-embedding-1',
          input: inputText,
          encoding_format: 'float'
        });

        embedding = response.data[0].embedding;

      } else {
        // Ollama
        const ollamaUrl = context.getNodeParameter('ollamaUrl', 'http://localhost:11434') as string;
        const model = context.getNodeParameter('ollamaModel', 'nomic-embed-text') as string;

        const axios = (await import('axios')).default;
        const response = await axios.post(`${ollamaUrl}/api/embeddings`, {
          model,
          prompt: inputText
        });

        embedding = response.data.embedding;
      }

      return {
        success: true,
        output: [{
          json: {
            embedding,
            dimensions: embedding.length,
            text: inputText.substring(0, 100) + (inputText.length > 100 ? '...' : '')
          }
        }]
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
