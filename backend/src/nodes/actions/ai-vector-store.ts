import { NodeType } from '../../types';

// In-memory vector store (in production, use Pinecone, Weaviate, or pgvector)
const vectorStores = new Map<string, VectorDocument[]>();

interface VectorDocument {
  id: string;
  text: string;
  embedding: number[];
  metadata: Record<string, any>;
  timestamp: number;
}

// Cosine similarity between two vectors
function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export const aiVectorStoreNode: NodeType = {
  name: 'aiVectorStore',
  displayName: 'AI Vector Store',
  description: 'Store and search vector embeddings',
  icon: 'fa:database',
  category: 'AI',
  version: 1,
  inputs: [
    {
      name: 'input',
      type: 'all',
      description: 'Documents to store or query'
    }
  ],
  outputs: [
    {
      name: 'output',
      type: 'all',
      description: 'Search results or confirmation'
    }
  ],
  properties: [
    {
      name: 'operation',
      displayName: 'Operation',
      type: 'options',
      options: [
        { name: 'Add Document', value: 'add' },
        { name: 'Search Similar', value: 'search' },
        { name: 'Get All', value: 'list' },
        { name: 'Delete', value: 'delete' },
        { name: 'Clear Store', value: 'clear' }
      ],
      default: 'add',
      description: 'Operation to perform'
    },
    {
      name: 'storeName',
      displayName: 'Store Name',
      type: 'string',
      default: 'default',
      description: 'Name of the vector store'
    },
    // Add operation fields
    {
      name: 'documentId',
      displayName: 'Document ID',
      type: 'string',
      description: 'Unique ID for the document',
      displayOptions: {
        show: {
          operation: ['add']
        }
      }
    },
    {
      name: 'documentText',
      displayName: 'Document Text',
      type: 'multiline',
      description: 'Text content to store',
      displayOptions: {
        show: {
          operation: ['add']
        }
      }
    },
    {
      name: 'embedding',
      displayName: 'Embedding Vector',
      type: 'json',
      description: 'Vector embedding (from AI Embedding node)',
      displayOptions: {
        show: {
          operation: ['add']
        }
      }
    },
    {
      name: 'metadata',
      displayName: 'Metadata',
      type: 'json',
      default: {},
      description: 'Additional metadata for the document',
      displayOptions: {
        show: {
          operation: ['add']
        }
      }
    },
    // Search operation fields
    {
      name: 'queryEmbedding',
      displayName: 'Query Embedding',
      type: 'json',
      description: 'Query vector (from AI Embedding node)',
      displayOptions: {
        show: {
          operation: ['search']
        }
      }
    },
    {
      name: 'topK',
      displayName: 'Top K Results',
      type: 'number',
      default: 5,
      description: 'Number of similar documents to return',
      displayOptions: {
        show: {
          operation: ['search']
        }
      }
    },
    {
      name: 'minScore',
      displayName: 'Minimum Score',
      type: 'number',
      default: 0.7,
      description: 'Minimum similarity score (0-1)',
      displayOptions: {
        show: {
          operation: ['search']
        }
      }
    },
    // Delete operation fields
    {
      name: 'deleteId',
      displayName: 'Document ID to Delete',
      type: 'string',
      description: 'ID of document to delete',
      displayOptions: {
        show: {
          operation: ['delete']
        }
      }
    }
  ],
  execute: async (context) => {
    try {
      const operation = context.getNodeParameter('operation', 'add') as string;
      const storeName = context.getNodeParameter('storeName', 'default') as string;

      // Initialize store if needed
      if (!vectorStores.has(storeName)) {
        vectorStores.set(storeName, []);
      }
      const store = vectorStores.get(storeName)!;

      switch (operation) {
        case 'add': {
          const documentId = context.getNodeParameter('documentId', '') as string || `doc_${Date.now()}`;
          const documentText = context.getNodeParameter('documentText', '') as string;
          const embedding = context.getNodeParameter('embedding', []) as number[];
          const metadata = context.getNodeParameter('metadata', {}) as Record<string, any>;

          // Also check input data
          const items = context.getInputData();
          const inputData = items[0]?.json || {};
          
          const finalText = documentText || inputData.text || inputData.content || JSON.stringify(inputData);
          const finalEmbedding = embedding.length > 0 ? embedding : inputData.embedding;
          const finalMetadata = { ...metadata, ...inputData.metadata };

          if (!finalText && finalEmbedding?.length === 0) {
            throw new Error('Document text or embedding is required');
          }

          // Remove existing document with same ID
          const existingIndex = store.findIndex(d => d.id === documentId);
          if (existingIndex >= 0) {
            store.splice(existingIndex, 1);
          }

          // Add new document
          store.push({
            id: documentId,
            text: finalText,
            embedding: finalEmbedding || [],
            metadata: finalMetadata,
            timestamp: Date.now()
          });

          return {
            success: true,
            output: [{
              json: {
                operation: 'add',
                documentId,
                storeName,
                totalDocuments: store.length
              }
            }]
          };
        }

        case 'search': {
          const queryEmbedding = context.getNodeParameter('queryEmbedding', []) as number[];
          const topK = context.getNodeParameter('topK', 5) as number;
          const minScore = context.getNodeParameter('minScore', 0.7) as number;

          // Check input data for query embedding
          const items = context.getInputData();
          const inputData = items[0]?.json || {};
          const finalQueryEmbedding = queryEmbedding.length > 0 ? queryEmbedding : inputData.embedding;

          if (finalQueryEmbedding.length === 0) {
            throw new Error('Query embedding is required for search');
          }

          // Calculate similarities
          const results = store
            .filter(doc => doc.embedding.length > 0)
            .map(doc => ({
              ...doc,
              score: cosineSimilarity(finalQueryEmbedding, doc.embedding)
            }))
            .filter(doc => doc.score >= minScore)
            .sort((a, b) => b.score - a.score)
            .slice(0, topK);

          return {
            success: true,
            output: [{
              json: {
                operation: 'search',
                storeName,
                results: results.map(r => ({
                  id: r.id,
                  text: r.text,
                  score: r.score,
                  metadata: r.metadata
                })),
                totalResults: results.length
              }
            }]
          };
        }

        case 'list': {
          return {
            success: true,
            output: [{
              json: {
                operation: 'list',
                storeName,
                documents: store.map(d => ({
                  id: d.id,
                  text: d.text.substring(0, 200) + (d.text.length > 200 ? '...' : ''),
                  metadata: d.metadata,
                  timestamp: d.timestamp
                })),
                totalDocuments: store.length
              }
            }]
          };
        }

        case 'delete': {
          const deleteId = context.getNodeParameter('deleteId', '') as string;
          
          if (!deleteId) {
            throw new Error('Document ID is required for delete');
          }

          const initialLength = store.length;
          const newStore = store.filter(d => d.id !== deleteId);
          vectorStores.set(storeName, newStore);

          return {
            success: true,
            output: [{
              json: {
                operation: 'delete',
                documentId: deleteId,
                storeName,
                deleted: newStore.length < initialLength,
                totalDocuments: newStore.length
              }
            }]
          };
        }

        case 'clear': {
          vectorStores.set(storeName, []);
          return {
            success: true,
            output: [{
              json: {
                operation: 'clear',
                storeName,
                totalDocuments: 0
              }
            }]
          };
        }

        default:
          throw new Error(`Unknown operation: ${operation}`);
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
