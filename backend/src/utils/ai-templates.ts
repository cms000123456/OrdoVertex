// AI Agent Workflow Templates

export const aiAgentTemplates = {
  // Simple Q&A Agent
  qaAgent: {
    name: 'Q&A AI Agent',
    description: 'Simple question-answering AI agent with memory',
    nodes: [
      {
        id: 'trigger-1',
        type: 'manualTrigger',
        name: 'Manual Trigger',
        position: { x: 100, y: 200 },
        parameters: {}
      },
      {
        id: 'agent-1',
        type: 'aiAgent',
        name: 'AI Agent',
        position: { x: 400, y: 200 },
        parameters: {
          provider: 'openai',
          model: 'gpt-4o-mini',
          useCredential: true,
          credentialId: '',
          temperature: 0.7,
          maxTokens: 2000,
          systemPrompt: 'You are a helpful assistant. Answer questions accurately and concisely.',
          enableMemory: true,
          memoryKey: '{{ $executionId }}',
          enableTools: true,
          selectedTools: ['get_current_time', 'calculate'],
          maxIterations: 5,
          jsonMode: false
        }
      }
    ],
    connections: [
      { id: 'conn-1', source: 'trigger-1', target: 'agent-1' }
    ]
  },

  // RAG Agent with Vector Store
  ragAgent: {
    name: 'RAG Document Assistant',
    description: 'Retrieval-Augmented Generation agent that searches documents',
    nodes: [
      {
        id: 'trigger-1',
        type: 'manualTrigger',
        name: 'Manual Trigger',
        position: { x: 100, y: 200 },
        parameters: {}
      },
      {
        id: 'embed-1',
        type: 'aiEmbedding',
        name: 'Query Embedding',
        position: { x: 400, y: 100 },
        parameters: {
          provider: 'openai',
          useCredential: true,
          credentialId: '',
          model: 'text-embedding-3-small',
          inputField: 'query'
        }
      },
      {
        id: 'search-1',
        type: 'aiVectorStore',
        name: 'Search Documents',
        position: { x: 700, y: 100 },
        parameters: {
          operation: 'search',
          storeName: 'documents',
          queryEmbedding: '{{ $json.embedding }}',
          topK: 5,
          minScore: 0.7
        }
      },
      {
        id: 'agent-1',
        type: 'aiAgent',
        name: 'RAG Agent',
        position: { x: 700, y: 300 },
        parameters: {
          provider: 'openai',
          model: 'gpt-4o',
          useCredential: true,
          credentialId: '',
          temperature: 0.3,
          maxTokens: 2000,
          systemPrompt: 'You are a helpful assistant. Use the provided context to answer questions accurately. If the answer is not in the context, say so.\n\nContext: {{ $json.results.map(r => r.text).join("\\n\\n") }}',
          enableMemory: false,
          enableTools: false,
          jsonMode: false
        }
      }
    ],
    connections: [
      { id: 'conn-1', source: 'trigger-1', target: 'embed-1' },
      { id: 'conn-2', source: 'embed-1', target: 'search-1' },
      { id: 'conn-3', source: 'search-1', target: 'agent-1' }
    ]
  },

  // Document Indexing Pipeline
  documentIndexer: {
    name: 'Document Indexing Pipeline',
    description: 'Process and index documents for RAG',
    nodes: [
      {
        id: 'trigger-1',
        type: 'manualTrigger',
        name: 'Manual Trigger',
        position: { x: 100, y: 200 },
        parameters: {}
      },
      {
        id: 'splitter-1',
        type: 'textSplitter',
        name: 'Split Document',
        position: { x: 400, y: 200 },
        parameters: {
          text: '',
          chunkSize: 1000,
          chunkOverlap: 200,
          separator: '\n\n'
        }
      },
      {
        id: 'code-1',
        type: 'code',
        name: 'Process Chunks',
        position: { x: 700, y: 200 },
        parameters: {
          language: 'javascript',
          code: `// Process each chunk and generate embeddings
const chunks = $input.all()[0].json.chunks;
const documents = chunks.map((chunk, index) => ({
  id: ` + '`doc_${Date.now()}_${index}`' + `,
  text: chunk,
  metadata: { index, timestamp: Date.now() }
}));

return { json: { documents } };`
        }
      }
    ],
    connections: [
      { id: 'conn-1', source: 'trigger-1', target: 'splitter-1' },
      { id: 'conn-2', source: 'splitter-1', target: 'code-1' }
    ]
  },

  // Multi-Agent Workflow
  multiAgent: {
    name: 'Multi-Agent Team',
    description: 'Multiple specialized AI agents working together',
    nodes: [
      {
        id: 'trigger-1',
        type: 'manualTrigger',
        name: 'Manual Trigger',
        position: { x: 100, y: 300 },
        parameters: {}
      },
      {
        id: 'researcher',
        type: 'aiAgent',
        name: 'Research Agent',
        position: { x: 400, y: 100 },
        parameters: {
          provider: 'openai',
          model: 'gpt-4o',
          useCredential: true,
          temperature: 0.7,
          systemPrompt: 'You are a research specialist. Gather information and provide detailed findings. Use web search if needed.',
          enableTools: true,
          selectedTools: ['web_search', 'get_current_time']
        }
      },
      {
        id: 'analyzer',
        type: 'aiAgent',
        name: 'Analysis Agent',
        position: { x: 400, y: 300 },
        parameters: {
          provider: 'openai',
          model: 'gpt-4o',
          useCredential: true,
          temperature: 0.3,
          systemPrompt: 'You are an analytical specialist. Analyze data and provide insights.',
          enableTools: true,
          selectedTools: ['calculate']
        }
      },
      {
        id: 'writer',
        type: 'aiAgent',
        name: 'Writer Agent',
        position: { x: 700, y: 200 },
        parameters: {
          provider: 'openai',
          model: 'gpt-4o',
          useCredential: true,
          temperature: 0.5,
          systemPrompt: 'You are a writing specialist. Create clear, well-structured content based on research and analysis.',
          enableTools: false
        }
      }
    ],
    connections: [
      { id: 'conn-1', source: 'trigger-1', target: 'researcher' },
      { id: 'conn-2', source: 'trigger-1', target: 'analyzer' },
      { id: 'conn-3', source: 'researcher', target: 'writer' },
      { id: 'conn-4', source: 'analyzer', target: 'writer' }
    ]
  },

  // Code Review Agent
  codeReviewAgent: {
    name: 'Code Review AI',
    description: 'AI agent that reviews code and provides feedback',
    nodes: [
      {
        id: 'trigger-1',
        type: 'manualTrigger',
        name: 'Manual Trigger',
        position: { x: 100, y: 200 },
        parameters: {}
      },
      {
        id: 'agent-1',
        type: 'aiAgent',
        name: 'Code Reviewer',
        position: { x: 400, y: 200 },
        parameters: {
          provider: 'openai',
          model: 'gpt-4o',
          useCredential: true,
          temperature: 0.2,
          maxTokens: 4000,
          systemPrompt: `You are an expert code reviewer. Analyze the provided code and provide:
1. Summary of what the code does
2. Potential bugs or issues
3. Security concerns
4. Performance improvements
5. Code style suggestions
6. Overall rating (1-10)

Be thorough but constructive in your feedback.`,
          enableMemory: false,
          enableTools: false,
          jsonMode: true
        }
      }
    ],
    connections: [
      { id: 'conn-1', source: 'trigger-1', target: 'agent-1' }
    ]
  }
};

export type AITemplateKey = keyof typeof aiAgentTemplates;
