import { NodeType } from '../../types';

export const imageDisplayNode: NodeType = {
  name: 'imageDisplay',
  displayName: 'Image Display',
  description: 'Display an image from URL in execution results',
  icon: 'fa:image',
  category: 'Actions',
  version: 1,
  inputs: [
    {
      name: 'input',
      type: 'all',
      description: 'Input containing image URL'
    }
  ],
  outputs: [
    {
      name: 'output',
      type: 'all',
      description: 'Image data for display'
    }
  ],
  properties: [
    {
      name: 'imageUrl',
      displayName: 'Image URL',
      type: 'string',
      default: '{{ $input.imageUrl }}',
      description: 'URL of the image to display (or use {{ $input.imageUrl }}, {{ $input.url }}, etc.)'
    },
    {
      name: 'altText',
      displayName: 'Alt Text',
      type: 'string',
      default: 'Image',
      description: 'Alternative text for the image'
    },
    {
      name: 'caption',
      displayName: 'Caption',
      type: 'string',
      default: '',
      description: 'Optional caption to display below the image'
    },
    {
      name: 'maxWidth',
      displayName: 'Max Width',
      type: 'string',
      default: '400px',
      description: 'Maximum width (e.g., 400px, 100%, etc.)'
    }
  ],
  execute: async (context) => {
    try {
      const items = context.getInputData();
      const item = items[0]?.json || {};
      
      // Replace template variables in URL
      let imageUrl = context.getNodeParameter('imageUrl', '') as string;
      imageUrl = imageUrl.replace(/\{\{\s*\$input\.(\w+)\s*\}\}/g, (_, key) => {
        return item[key] || '';
      });
      
      // Also try common field names if URL is empty
      if (!imageUrl) {
        imageUrl = item.imageUrl || item.url || item.image || item.src || item.link || '';
      }
      
      const altText = context.getNodeParameter('altText', 'Image') as string;
      const caption = context.getNodeParameter('caption', '') as string;
      const maxWidth = context.getNodeParameter('maxWidth', '400px') as string;
      
      // Return structured image data with display hint
      const output = [{
        json: {
          imageUrl,
          altText,
          caption,
          maxWidth,
          // Mark this as displayable image for frontend
          _display: {
            type: 'image',
            url: imageUrl,
            alt: altText,
            caption: caption,
            maxWidth: maxWidth
          }
        }
      }];
      
      return { success: true, output };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Image display failed'
      };
    }
  }
};
