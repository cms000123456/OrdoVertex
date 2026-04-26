import { NodeType } from '../../types';
import { getErrorMessage } from '../../utils/error-helper';

export const markdownViewerNode: NodeType = {
  name: 'markdownViewer',
  displayName: 'Markdown Viewer',
  description: 'Render markdown content for display in results',
  icon: 'fa:eye',
  category: 'Actions',
  version: 1,
  inputs: [
    {
      name: 'input',
      type: 'all',
      description: 'Input containing markdown content'
    }
  ],
  outputs: [
    {
      name: 'output',
      type: 'all',
      description: 'Markdown display output'
    }
  ],
  properties: [
    {
      name: 'sourceField',
      displayName: 'Source Field',
      type: 'string',
      default: '',
      description: 'Field to read markdown from (leave empty to auto-detect: _display.content, markdown, text, message, response, content)'
    },
    {
      name: 'title',
      displayName: 'Title',
      type: 'string',
      default: '',
      description: 'Optional title to show above the markdown'
    }
  ],
  execute: async (context) => {
    try {
      const sourceField = context.getNodeParameter('sourceField', '') as string;
      const title = context.getNodeParameter('title', '') as string;
      const items = context.getInputData();
      const inputData = items[0]?.json || {};

      let markdown = '';

      if (sourceField) {
        markdown = inputData[sourceField] || '';
      } else {
        // Auto-detect common markdown fields
        markdown = inputData._display?.content
          || inputData.markdown
          || inputData.text
          || inputData.message
          || inputData.response
          || inputData.content
          || inputData.output
          || JSON.stringify(inputData, null, 2);
      }

      if (typeof markdown !== 'string') {
        markdown = JSON.stringify(markdown, null, 2);
      }

      return {
        success: true,
        output: [{
          json: {
            markdown,
            title,
            _display: {
              type: 'markdown',
              content: title ? `# ${title}\n\n${markdown}` : markdown
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
