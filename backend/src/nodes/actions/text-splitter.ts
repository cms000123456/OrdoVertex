import { NodeType } from '../../types';
import { getErrorMessage } from '../../utils/error-helper';

export const textSplitterNode: NodeType = {
  name: 'textSplitter',
  displayName: 'Text Splitter',
  description: 'Split text into chunks for processing',
  icon: 'fa:cut',
  category: 'AI',
  version: 1,
  inputs: [
    {
      name: 'input',
      type: 'all',
      description: 'Text to split'
    }
  ],
  outputs: [
    {
      name: 'chunks',
      type: 'all',
      description: 'Array of text chunks'
    }
  ],
  properties: [
    {
      name: 'text',
      displayName: 'Text',
      type: 'multiline',
      description: 'Text to split (or use input)'
    },
    {
      name: 'chunkSize',
      displayName: 'Chunk Size',
      type: 'number',
      default: 1000,
      description: 'Maximum characters per chunk'
    },
    {
      name: 'chunkOverlap',
      displayName: 'Chunk Overlap',
      type: 'number',
      default: 200,
      description: 'Characters to overlap between chunks'
    },
    {
      name: 'separator',
      displayName: 'Separator',
      type: 'options',
      options: [
        { name: 'Paragraph (\\n\\n)', value: '\n\n' },
        { name: 'Line (\\n)', value: '\n' },
        { name: 'Sentence (.)', value: '.' },
        { name: 'Space', value: ' ' },
        { name: 'Character', value: '' }
      ],
      default: '\n\n',
      description: 'Preferred split point'
    }
  ],
  execute: async (context) => {
    try {
      const items = context.getInputData();
      const inputText = context.getNodeParameter('text', '') as string || 
                       items[0]?.json?.text || 
                       items[0]?.json?.content ||
                       JSON.stringify(items[0]?.json);

      const chunkSize = context.getNodeParameter('chunkSize', 1000) as number;
      const chunkOverlap = context.getNodeParameter('chunkOverlap', 200) as number;
      const separator = context.getNodeParameter('separator', '\n\n') as string;

      if (!inputText) {
        throw new Error('No text provided to split');
      }

      const chunks: string[] = [];
      
      // Simple recursive text splitting
      function splitText(text: string): string[] {
        // If text is small enough, return as is
        if (text.length <= chunkSize) {
          return [text];
        }

        // Try to split at separator
        if (separator) {
          const parts = text.split(separator);
          const result: string[] = [];
          let currentChunk = '';

          for (const part of parts) {
            const partWithSep = part + separator;
            if (currentChunk.length + partWithSep.length <= chunkSize) {
              currentChunk += partWithSep;
            } else {
              if (currentChunk) {
                result.push(currentChunk.trim());
              }
              // If single part is too big, split it further
              if (part.length > chunkSize) {
                result.push(...splitBySize(part, chunkSize));
              } else {
                currentChunk = partWithSep;
              }
            }
          }
          if (currentChunk) {
            result.push(currentChunk.trim());
          }
          return result;
        } else {
          // Split by size only
          return splitBySize(text, chunkSize);
        }
      }

      function splitBySize(text: string, size: number): string[] {
        const result: string[] = [];
        for (let i = 0; i < text.length; i += size) {
          result.push(text.slice(i, i + size));
        }
        return result;
      }

      // Generate chunks
      const baseChunks = splitText(inputText);

      // Add overlap
      for (let i = 0; i < baseChunks.length; i++) {
        let chunk = baseChunks[i];
        
        // Add overlap from previous chunk
        if (i > 0 && chunkOverlap > 0) {
          const prevChunk = baseChunks[i - 1];
          const overlapText = prevChunk.slice(-chunkOverlap);
          chunk = overlapText + chunk;
        }
        
        chunks.push(chunk.trim());
      }

      return {
        success: true,
        output: [{
          json: {
            chunks,
            totalChunks: chunks.length,
            originalLength: inputText.length,
            avgChunkSize: Math.round(inputText.length / chunks.length)
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
