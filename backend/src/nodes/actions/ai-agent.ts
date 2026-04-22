import { NodeType } from '../../types';
import { getErrorMessage } from '../../utils/error-helper';
import { prisma } from '../../prisma';
import { validateExpression } from '../../utils/safe-eval';
import { decryptJSON } from '../../utils/encryption';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';


// AI Agent memory storage with LRU eviction and TTL
const MAX_MEMORY_ENTRIES = 1000;
const MEMORY_TTL_MS = 60 * 60 * 1000; // 1 hour

interface MemoryEntry {
  messages: any[];
  lastAccessed: number;
}

const agentMemory = new Map<string, MemoryEntry>();

function cleanupExpiredMemory() {
  const now = Date.now();
  for (const [key, entry] of agentMemory) {
    if (now - entry.lastAccessed > MEMORY_TTL_MS) {
      agentMemory.delete(key);
    }
  }
}

function getMemory(key: string): any[] | undefined {
  cleanupExpiredMemory();
  const entry = agentMemory.get(key);
  if (entry) {
    entry.lastAccessed = Date.now();
    return entry.messages;
  }
  return undefined;
}

function setMemory(key: string, messages: any[]) {
  cleanupExpiredMemory();
  // Evict oldest if at capacity
  if (agentMemory.size >= MAX_MEMORY_ENTRIES && !agentMemory.has(key)) {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    for (const [k, entry] of agentMemory) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = k;
      }
    }
    if (oldestKey) {
      agentMemory.delete(oldestKey);
    }
  }
  agentMemory.set(key, { messages, lastAccessed: Date.now() });
}

interface Tool {
  name: string;
  description: string;
  parameters: Record<string, any>;
  execute: (params: any) => Promise<any>;
}

interface AgentConfig {
  provider: 'openai' | 'anthropic' | 'gemini' | 'kimi' | 'ollama' | 'custom';
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  enableMemory: boolean;
  tools: string[];
  credentialId?: string;
}

// Built-in tools for AI agents
const builtInTools: Record<string, Tool> = {
  web_search: {
    name: 'web_search',
    description: 'Search the web for information',
    parameters: {
      query: { type: 'string', description: 'Search query' }
    },
    execute: async (params: { query: string }) => {
      // Placeholder - would integrate with search API
      return { results: `Search results for: ${params.query}` };
    }
  },
  http_request: {
    name: 'http_request',
    description: 'Make an HTTP request',
    parameters: {
      url: { type: 'string', description: 'URL to request' },
      method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE'] },
      body: { type: 'object', description: 'Request body' }
    },
    execute: async (params: any) => {
      const axios = (await import('axios')).default;
      const response = await axios({
        url: params.url,
        method: params.method || 'GET',
        data: params.body
      });
      return response.data;
    }
  },
  calculate: {
    name: 'calculate',
    description: 'Perform mathematical calculations',
    parameters: {
      expression: { type: 'string', description: 'Math expression to evaluate' }
    },
    execute: async (params: { expression: string }) => {
      try {
        const validation = validateExpression(params.expression);
        if (!validation.valid) {
          return { error: validation.error };
        }
        const result = Function('"use strict"; return (' + params.expression + ')')();
        return { result };
      } catch (error) {
        return { error: 'Invalid expression' };
      }
    }
  },
  get_current_time: {
    name: 'get_current_time',
    description: 'Get the current date and time',
    parameters: {},
    execute: async () => {
      return { 
        datetime: new Date().toISOString(),
        timestamp: Date.now()
      };
    }
  }
};

export const aiAgentNode: NodeType = {
  name: 'aiAgent',
  displayName: 'AI Agent',
  description: 'AI agent with memory, tools, and multi-step reasoning',
  icon: 'fa:robot',
  category: 'AI',
  version: 1,
  inputs: [
    {
      name: 'input',
      type: 'all',
      description: 'Input message or context'
    }
  ],
  outputs: [
    {
      name: 'output',
      type: 'all',
      description: 'Agent response'
    },
    {
      name: 'tool_calls',
      type: 'all',
      description: 'Tool calls made by agent'
    }
  ],
  properties: [
    {
      name: 'provider',
      displayName: 'AI Provider',
      type: 'options',
      options: [
        { name: 'OpenAI', value: 'openai' },
        { name: 'Anthropic Claude', value: 'anthropic' },
        { name: 'Google Gemini', value: 'gemini' },
        { name: 'Kimi AI (Moonshot)', value: 'kimi' },
        { name: 'Ollama (Local)', value: 'ollama' },
        { name: 'Custom API', value: 'custom' }
      ],
      default: 'openai',
      description: 'AI model provider'
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
      description: 'Select API credentials',
      displayOptions: {
        show: {
          useCredential: [true]
        }
      }
    },
    {
      name: 'apiKey',
      displayName: 'API Key',
      type: 'string',
      required: true,
      description: 'API key for the provider',
      displayOptions: {
        show: {
          useCredential: [false]
        }
      }
    },
    {
      name: 'model',
      displayName: 'Model',
      type: 'options',
      required: true,
      description: 'AI model to use',
      displayOptions: {
        show: {
          provider: ['openai']
        }
      },
      options: [
        { name: 'GPT-4o', value: 'gpt-4o' },
        { name: 'GPT-4o Mini', value: 'gpt-4o-mini' },
        { name: 'GPT-4 Turbo', value: 'gpt-4-turbo' },
        { name: 'GPT-3.5 Turbo', value: 'gpt-3.5-turbo' }
      ],
      default: 'gpt-4o-mini'
    },
    {
      name: 'claudeModel',
      displayName: 'Model',
      type: 'options',
      required: true,
      description: 'Claude model to use',
      displayOptions: {
        show: {
          provider: ['anthropic']
        }
      },
      options: [
        { name: 'Claude 3.5 Sonnet', value: 'claude-3-5-sonnet-20240620' },
        { name: 'Claude 3 Opus', value: 'claude-3-opus-20240229' },
        { name: 'Claude 3 Sonnet', value: 'claude-3-sonnet-20240229' },
        { name: 'Claude 3 Haiku', value: 'claude-3-haiku-20240307' }
      ],
      default: 'claude-3-5-sonnet-20240620'
    },
    {
      name: 'geminiModel',
      displayName: 'Model',
      type: 'options',
      required: true,
      description: 'Gemini model to use',
      displayOptions: {
        show: {
          provider: ['gemini']
        }
      },
      options: [
        { name: 'Gemini 2.0 Flash', value: 'gemini-2.0-flash-exp' },
        { name: 'Gemini 1.5 Pro', value: 'gemini-1.5-pro' },
        { name: 'Gemini 1.5 Flash', value: 'gemini-1.5-flash' },
        { name: 'Gemini 1.5 Flash-8B', value: 'gemini-1.5-flash-8b' }
      ],
      default: 'gemini-1.5-flash'
    },
    {
      name: 'kimiModel',
      displayName: 'Model',
      type: 'options',
      required: true,
      description: 'Kimi model to use',
      displayOptions: {
        show: {
          provider: ['kimi']
        }
      },
      options: [
        { name: 'Kimi K2', value: 'kimi-k2-0711' },
        { name: 'Kimi K1.6', value: 'kimi-k1.6-0711' },
        { name: 'Kimi K1.5', value: 'kimi-k1.5' },
        { name: 'Kimi Latest', value: 'kimi-latest' }
      ],
      default: 'kimi-k2-0711'
    },
    {
      name: 'kimiBaseUrl',
      displayName: 'Base URL',
      type: 'string',
      required: true,
      description: 'Kimi API base URL',
      default: 'https://api.moonshot.cn/v1',
      displayOptions: {
        show: {
          provider: ['kimi']
        }
      }
    },
    {
      name: 'ollamaModel',
      displayName: 'Ollama Model',
      type: 'string',
      required: true,
      description: 'Ollama model name (e.g., llama3.1, mistral)',
      default: 'llama3.1',
      displayOptions: {
        show: {
          provider: ['ollama']
        }
      }
    },
    {
      name: 'ollamaUrl',
      displayName: 'Ollama URL',
      type: 'string',
      required: true,
      description: 'Ollama server URL',
      default: 'http://localhost:11434',
      displayOptions: {
        show: {
          provider: ['ollama']
        }
      }
    },
    {
      name: 'customUrl',
      displayName: 'API URL',
      type: 'string',
      required: true,
      description: 'Custom API endpoint URL',
      displayOptions: {
        show: {
          provider: ['custom']
        }
      }
    },
    {
      name: 'temperature',
      displayName: 'Temperature',
      type: 'number',
      default: 0.7,
      description: 'Sampling temperature (0-2)'
    },
    {
      name: 'maxTokens',
      displayName: 'Max Tokens',
      type: 'number',
      default: 2000,
      description: 'Maximum tokens to generate'
    },
    {
      name: 'systemPrompt',
      displayName: 'System Prompt',
      type: 'multiline',
      default: 'You are a helpful AI assistant.',
      description: 'System instructions for the AI'
    },
    {
      name: 'enableMemory',
      displayName: 'Enable Memory',
      type: 'boolean',
      default: true,
      description: 'Remember conversation history'
    },
    {
      name: 'memoryKey',
      displayName: 'Memory Key',
      type: 'string',
      default: '{{ $executionId }}',
      description: 'Unique key for this conversation memory'
    },
    {
      name: 'enableTools',
      displayName: 'Enable Tools',
      type: 'boolean',
      default: true,
      description: 'Allow AI to use tools'
    },
    {
      name: 'selectedTools',
      displayName: 'Available Tools',
      type: 'json',
      default: ['get_current_time', 'calculate'],
      description: 'Tools the AI can use (JSON array)'
    },
    {
      name: 'maxIterations',
      displayName: 'Max Tool Iterations',
      type: 'number',
      default: 5,
      description: 'Maximum number of tool calls per request'
    },
    {
      name: 'jsonMode',
      displayName: 'JSON Mode',
      type: 'boolean',
      default: false,
      description: 'Force JSON output'
    }
  ],
  execute: async (context) => {
    try {
      const provider = context.getNodeParameter('provider', 'openai') as string;
      const useCredential = context.getNodeParameter('useCredential', true) as boolean;
      const temperature = context.getNodeParameter('temperature', 0.7) as number;
      const maxTokens = context.getNodeParameter('maxTokens', 2000) as number;
      const systemPrompt = context.getNodeParameter('systemPrompt', '') as string;
      const enableMemory = context.getNodeParameter('enableMemory', true) as boolean;
      const memoryKeyTemplate = context.getNodeParameter('memoryKey', '{{ $executionId }}') as string;
      const enableTools = context.getNodeParameter('enableTools', true) as boolean;
      const selectedTools = context.getNodeParameter('selectedTools', []) as string[];
      const maxIterations = context.getNodeParameter('maxIterations', 5) as number;
      const jsonMode = context.getNodeParameter('jsonMode', false) as boolean;

      // Get input
      const items = context.getInputData();
      const userMessage = items[0]?.json?.message || items[0]?.json?.input || JSON.stringify(items[0]?.json);

      // Resolve memory key
      const memoryKey = memoryKeyTemplate.replace('{{ $executionId }}', context.executionId ?? '');

      // Get API key
      let apiKey: string;
      if (useCredential) {
        const credentialId = context.getNodeParameter('credentialId', '') as string;
        if (!credentialId) {
          throw new Error('No credential selected');
        }
        const credential = await prisma.credential.findFirst({
          where: { id: credentialId, userId: context.userId }
        });
        if (!credential) {
          throw new Error('Credential not found');
        }
        const credData = decryptJSON(credential.data, credential.iv);
        apiKey = credData.apiKey || credData.key;
      } else {
        apiKey = context.getNodeParameter('apiKey', '') as string;
      }

      if (!apiKey) {
        throw new Error('API key is required');
      }

      // Get or initialize memory
      let messages: any[] = [];
      if (enableMemory) {
        messages = getMemory(memoryKey) || [];
        if (messages.length === 0 && systemPrompt) {
          messages.push({ role: 'system', content: systemPrompt });
        }
      } else if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
      }

      // Add user message
      messages.push({ role: 'user', content: userMessage });

      // Prepare tools
      const tools = enableTools ? selectedTools
        .map(name => builtInTools[name])
        .filter(Boolean)
        .map(tool => ({
          type: 'function' as const,
          function: {
            name: tool.name,
            description: tool.description,
            parameters: {
              type: 'object',
              properties: tool.parameters
            }
          }
        })) : [];

      let response = '';
      let toolCalls: any[] = [];

      // Call appropriate provider
      if (provider === 'openai') {
        const model = context.getNodeParameter('model', 'gpt-4o-mini') as string;
        const openai = new OpenAI({ apiKey });

        let iteration = 0;
        let currentMessages = [...messages];

        while (iteration < maxIterations) {
          const completion = await openai.chat.completions.create({
            model,
            messages: currentMessages,
            temperature,
            max_tokens: maxTokens,
            tools: tools.length > 0 ? tools : undefined,
            response_format: jsonMode ? { type: 'json_object' } : undefined
          });

          const choice = completion.choices[0];
          const message = choice.message;

          if (message.tool_calls && message.tool_calls.length > 0) {
            // Add assistant message with tool calls
            currentMessages.push({
              role: 'assistant',
              content: message.content || '',
              tool_calls: message.tool_calls
            });

            // Execute tools
            for (const toolCall of message.tool_calls) {
              const toolName = toolCall.function.name;
              const toolParams = JSON.parse(toolCall.function.arguments);
              const tool = builtInTools[toolName];

              if (tool) {
                try {
                  const result = await tool.execute(toolParams);
                  currentMessages.push({
                    role: 'tool',
                    tool_call_id: toolCall.id,
                    content: JSON.stringify(result)
                  });
                  toolCalls.push({
                    tool: toolName,
                    params: toolParams,
                    result
                  });
                } catch (error: unknown) {
                  currentMessages.push({
                    role: 'tool',
                    tool_call_id: toolCall.id,
                    content: JSON.stringify({ error: getErrorMessage(error) })
                  });
                }
              }
            }
            iteration++;
          } else {
            response = message.content || '';
            if (enableMemory) {
              currentMessages.push({ role: 'assistant', content: response });
              setMemory(memoryKey, currentMessages);
            }
            break;
          }
        }

        if (iteration >= maxIterations) {
          throw new Error('Max tool iterations reached');
        }

      } else if (provider === 'anthropic') {
        const model = context.getNodeParameter('claudeModel', 'claude-3-5-sonnet-20240620') as string;
        const anthropic = new Anthropic({ apiKey });

        const msg = await anthropic.messages.create({
          model,
          max_tokens: maxTokens,
          temperature,
          system: systemPrompt,
          messages: messages.filter(m => m.role !== 'system').map(m => ({
            role: m.role as 'user' | 'assistant',
            content: m.content
          }))
        });

        response = msg.content[0]?.type === 'text' ? msg.content[0].text : '';

        if (enableMemory) {
          messages.push({ role: 'assistant', content: response });
          setMemory(memoryKey, messages);
        }

      } else if (provider === 'gemini') {
        const modelName = context.getNodeParameter('geminiModel', 'gemini-1.5-flash') as string;
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: modelName });

        // Configure generation
        const generationConfig = {
          temperature,
          maxOutputTokens: maxTokens,
        };

        // Build chat history for Gemini (excluding system message)
        const chatHistory = messages
          .filter(m => m.role !== 'system')
          .map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }]
          }));

        // Start chat with history (if any)
        const chat = model.startChat({
          generationConfig,
          history: chatHistory.length > 0 ? chatHistory : undefined,
        });

        // Get the last user message
        const lastUserMessage = messages.filter(m => m.role === 'user').pop();
        const prompt = lastUserMessage?.content || '';

        // Send message and get response
        const systemInstruction = systemPrompt || 'You are a helpful AI assistant.';
        const fullPrompt = chatHistory.length <= 1 ? `${systemInstruction}\n\n${prompt}` : prompt;
        
        const result = await chat.sendMessage(fullPrompt);
        response = result.response.text();

        if (enableMemory) {
          messages.push({ role: 'assistant', content: response });
          setMemory(memoryKey, messages);
        }

      } else if (provider === 'kimi') {
        // Kimi AI uses OpenAI-compatible API
        const model = context.getNodeParameter('kimiModel', 'kimi-k2-0711') as string;
        const kimiBaseUrl = context.getNodeParameter('kimiBaseUrl', 'https://api.moonshot.cn/v1') as string;
        
        const kimi = new OpenAI({
          apiKey,
          baseURL: kimiBaseUrl
        });

        let iteration = 0;
        let currentMessages = [...messages];

        while (iteration < maxIterations) {
          const completion = await kimi.chat.completions.create({
            model,
            messages: currentMessages,
            temperature,
            max_tokens: maxTokens,
            tools: tools.length > 0 ? tools : undefined,
            response_format: jsonMode ? { type: 'json_object' } : undefined
          });

          const choice = completion.choices[0];
          const message = choice.message;

          if (message.tool_calls && message.tool_calls.length > 0) {
            currentMessages.push({
              role: 'assistant',
              content: message.content || '',
              tool_calls: message.tool_calls
            });

            for (const toolCall of message.tool_calls) {
              const toolName = toolCall.function.name;
              const toolParams = JSON.parse(toolCall.function.arguments);
              const tool = builtInTools[toolName];

              if (tool) {
                try {
                  const result = await tool.execute(toolParams);
                  currentMessages.push({
                    role: 'tool',
                    tool_call_id: toolCall.id,
                    content: JSON.stringify(result)
                  });
                  toolCalls.push({
                    tool: toolName,
                    params: toolParams,
                    result
                  });
                } catch (error: unknown) {
                  currentMessages.push({
                    role: 'tool',
                    tool_call_id: toolCall.id,
                    content: JSON.stringify({ error: getErrorMessage(error) })
                  });
                }
              }
            }
            iteration++;
          } else {
            response = message.content || '';
            if (enableMemory) {
              currentMessages.push({ role: 'assistant', content: response });
              setMemory(memoryKey, currentMessages);
            }
            break;
          }
        }

        if (iteration >= maxIterations) {
          throw new Error('Max tool iterations reached');
        }

      } else if (provider === 'ollama') {
        const model = context.getNodeParameter('ollamaModel', 'llama3.1') as string;
        const ollamaUrl = context.getNodeParameter('ollamaUrl', 'http://localhost:11434') as string;

        const axios = (await import('axios')).default;
        const result = await axios.post(`${ollamaUrl}/api/chat`, {
          model,
          messages,
          stream: false,
          options: {
            temperature,
            num_predict: maxTokens
          }
        });

        response = result.data.message?.content || '';

        if (enableMemory) {
          messages.push({ role: 'assistant', content: response });
          setMemory(memoryKey, messages);
        }

      } else {
        // Custom provider
        const customUrl = context.getNodeParameter('customUrl', '') as string;
        const axios = (await import('axios')).default;
        
        const result = await axios.post(customUrl, {
          messages,
          temperature,
          max_tokens: maxTokens
        }, {
          headers: { 'Authorization': `Bearer ${apiKey}` }
        });

        response = result.data.choices?.[0]?.message?.content || result.data.response || '';

        if (enableMemory) {
          messages.push({ role: 'assistant', content: response });
          setMemory(memoryKey, messages);
        }
      }

      return {
        success: true,
        output: [
          {
            json: {
              response,
              toolCalls: toolCalls.length > 0 ? toolCalls : undefined
            }
          }
        ]
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
