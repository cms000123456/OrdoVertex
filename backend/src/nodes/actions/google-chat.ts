import { NodeType } from '../../types';
import { prisma } from '../../prisma';
import { decryptJSON } from '../../utils/encryption';


export const googleChatNode: NodeType = {
  name: 'googleChat',
  displayName: 'Google Chat',
  description: 'Send messages to Google Chat spaces via webhook',
  icon: 'fa:comment-dots',
  category: 'Actions',
  version: 1,
  inputs: [
    {
      name: 'input',
      type: 'all',
      description: 'Input data for the message'
    }
  ],
  outputs: [
    {
      name: 'output',
      type: 'all',
      description: 'Response from Google Chat'
    }
  ],
  credentials: [
    {
      name: 'googleChatWebhook',
      requiredFields: ['webhookUrl']
    }
  ],
  properties: [
    {
      name: 'credentialId',
      displayName: 'Saved Webhook',
      type: 'resource',
      resourceType: 'credential',
      default: '',
      description: 'Select a saved Google Chat webhook. Save webhooks via Credentials Manager — each can have a name and description (e.g. "Marketing Alerts", "Dev Team").'
    },
    {
      name: 'webhookUrl',
      displayName: 'Webhook URL',
      type: 'string',
      default: '',
      description: 'Paste a webhook URL here if you are not using a saved credential. Get it from your Google Chat space: Settings > Apps & integrations > Webhooks.'
    },
    {
      name: 'messageType',
      displayName: 'Message Type',
      type: 'options',
      options: [
        { name: 'Simple Text', value: 'text' },
        { name: 'Card (Rich Format)', value: 'card' }
      ],
      default: 'text',
      description: 'Type of message to send'
    },
    {
      name: 'text',
      displayName: 'Message Text',
      type: 'multiline',
      default: 'Hello from OrdoVertex!',
      description: 'Plain text message to send',
      displayOptions: {
        show: {
          messageType: ['text']
        }
      }
    },
    {
      name: 'cardTitle',
      displayName: 'Card Title',
      type: 'string',
      default: 'OrdoVertex Notification',
      description: 'Title of the card',
      displayOptions: {
        show: {
          messageType: ['card']
        }
      }
    },
    {
      name: 'cardSubtitle',
      displayName: 'Card Subtitle',
      type: 'string',
      default: '',
      description: 'Optional subtitle shown below the card title',
      displayOptions: {
        show: {
          messageType: ['card']
        }
      }
    },
    {
      name: 'cardText',
      displayName: 'Card Content',
      type: 'multiline',
      default: 'Workflow executed successfully!',
      description: 'Main content of the card',
      displayOptions: {
        show: {
          messageType: ['card']
        }
      }
    },
    {
      name: 'cardImageUrl',
      displayName: 'Image URL',
      type: 'string',
      default: '',
      description: 'Optional image to show in the card. Supports {{ $input.field }} template variables.',
      displayOptions: {
        show: {
          messageType: ['card']
        }
      }
    },
    {
      name: 'cardImageAspectRatio',
      displayName: 'Image Aspect Ratio',
      type: 'number',
      default: 1.7778,
      description: 'Width/height ratio of the image (e.g. 1.7778 for 16:9, 1.3333 for 4:3, 1 for square). Match the image\'s natural ratio to avoid cropping.',
      displayOptions: {
        show: {
          messageType: ['card']
        }
      }
    },
    {
      name: 'useTemplate',
      displayName: 'Use Template Variables',
      type: 'boolean',
      default: true,
      description: 'Replace {{ $input.field }} placeholders with values from the input data'
    }
  ],
  execute: async (context) => {
    try {
      // Resolve webhook URL: saved credential takes priority over manual URL
      let webhookUrl = context.getNodeParameter('webhookUrl', '') as string;
      const credentialId = context.getNodeParameter('credentialId', '') as string;

      if (credentialId) {
        try {
          const credential = await prisma.credential.findFirst({
            where: { deletedAt: null, id: credentialId, userId: context.userId }
          });
          if (!credential) {
            return { success: false, error: `Credential not found (id: ${credentialId}). Make sure it was saved and belongs to your account.` };
          }
          const credData = decryptJSON(credential.data, credential.iv) as Record<string, string>;
          if (!credData.webhookUrl) {
            return { success: false, error: 'Credential is missing the webhookUrl field.' };
          }
          webhookUrl = credData.webhookUrl;
        } catch (credError) {
          return { success: false, error: `Failed to load credential: ${credError instanceof Error ? credError.message : String(credError)}` };
        }
      }

      if (!webhookUrl) {
        return {
          success: false,
          error: 'No webhook URL configured. Select a saved webhook or paste a URL directly.'
        };
      }

      const messageType = context.getNodeParameter('messageType', 'text') as string;
      const useTemplate = context.getNodeParameter('useTemplate', true) as boolean;

      // Get input data for template replacement
      const items = context.getInputData();
      const inputData = items[0]?.json || {};

      const replaceTemplate = (text: string): string => {
        if (!useTemplate) return text;
        return text.replace(/\{\{\s*\$input\.(\w+)\s*\}\}/g, (_, key) => {
          return inputData[key] ?? '';
        });
      };

      let payload: any;

      if (messageType === 'text') {
        let text = context.getNodeParameter('text', 'Hello from OrdoVertex!') as string;
        text = replaceTemplate(text);
        payload = { text };
      } else {
        let title = context.getNodeParameter('cardTitle', 'OrdoVertex Notification') as string;
        let subtitle = context.getNodeParameter('cardSubtitle', '') as string;
        let text = context.getNodeParameter('cardText', 'Workflow executed successfully!') as string;
        let imageUrl = context.getNodeParameter('cardImageUrl', '') as string;

        title = replaceTemplate(title);
        subtitle = replaceTemplate(subtitle);
        text = replaceTemplate(text);
        imageUrl = replaceTemplate(imageUrl);

        const widgets: any[] = [];

        if (imageUrl) {
          const aspectRatio = context.getNodeParameter('cardImageAspectRatio', 1.7778) as number;
          widgets.push({
            image: {
              imageUrl: imageUrl,
              aspectRatio,
              onClick: {
                openLink: { url: imageUrl }
              }
            }
          });
        }

        widgets.push({
          textParagraph: { text }
        });

        payload = {
          cards: [
            {
              header: {
                title: title,
                subtitle: subtitle || undefined,
                imageUrl: 'https://www.gstatic.com/images/icons/material/product/2x/hangouts_64dp.png'
              },
              sections: [
                {
                  widgets: widgets
                }
              ]
            }
          ]
        };
      }

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `Google Chat API error: ${response.status} ${errorText}`
        };
      }

      const responseData = await response.json();

      return {
        success: true,
        output: [{
          json: {
            message: 'Message sent to Google Chat',
            type: messageType,
            response: responseData,
            sentAt: new Date().toISOString()
          }
        }]
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send Google Chat message'
      };
    }
  }
};
