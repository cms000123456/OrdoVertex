import { NodeType } from '../../types';
import nodemailer from 'nodemailer';

export const sendEmailNode: NodeType = {
  name: 'sendEmail',
  displayName: 'Send Email',
  description: 'Send emails via SMTP',
  icon: 'fa:envelope',
  category: 'Actions',
  version: 1,
  inputs: [
    {
      name: 'input',
      type: 'all',
      description: 'Input data for email'
    }
  ],
  outputs: [
    {
      name: 'output',
      type: 'all',
      description: 'Email send result'
    }
  ],
  properties: [
    {
      name: 'useCredential',
      displayName: 'Use Credential',
      type: 'boolean',
      default: true,
      description: 'Use saved SMTP credentials'
    },
    {
      name: 'credentialId',
      displayName: 'SMTP Credential',
      type: 'resource',
      resourceType: 'credential',
      required: true,
      displayOptions: {
        show: {
          useCredential: [true]
        }
      }
    },
    {
      name: 'smtpHost',
      displayName: 'SMTP Host',
      type: 'string',
      default: 'smtp.gmail.com',
      displayOptions: {
        show: {
          useCredential: [false]
        }
      }
    },
    {
      name: 'smtpPort',
      displayName: 'SMTP Port',
      type: 'number',
      default: 587,
      displayOptions: {
        show: {
          useCredential: [false]
        }
      }
    },
    {
      name: 'smtpUser',
      displayName: 'Username',
      type: 'string',
      displayOptions: {
        show: {
          useCredential: [false]
        }
      }
    },
    {
      name: 'smtpPassword',
      displayName: 'Password',
      type: 'string',
      displayOptions: {
        show: {
          useCredential: [false]
        }
      }
    },
    {
      name: 'smtpSecure',
      displayName: 'Use TLS',
      type: 'boolean',
      default: false,
      description: 'Use TLS (port 465) instead of STARTTLS',
      displayOptions: {
        show: {
          useCredential: [false]
        }
      }
    },
    {
      name: 'from',
      displayName: 'From',
      type: 'string',
      default: 'noreply@example.com',
      description: 'Sender email address'
    },
    {
      name: 'to',
      displayName: 'To',
      type: 'string',
      default: '{{ $input.email }}',
      description: 'Recipient email(s), comma-separated'
    },
    {
      name: 'cc',
      displayName: 'CC',
      type: 'string',
      description: 'CC recipients, comma-separated'
    },
    {
      name: 'bcc',
      displayName: 'BCC',
      type: 'string',
      description: 'BCC recipients, comma-separated'
    },
    {
      name: 'subject',
      displayName: 'Subject',
      type: 'string',
      default: 'Hello from OrdoVertex',
      description: 'Email subject'
    },
    {
      name: 'bodyType',
      displayName: 'Body Type',
      type: 'options',
      options: [
        { name: 'Plain Text', value: 'text' },
        { name: 'HTML', value: 'html' },
        { name: 'Markdown', value: 'markdown' }
      ],
      default: 'text'
    },
    {
      name: 'body',
      displayName: 'Body',
      type: 'multiline',
      default: 'Hello {{ $input.name }},\n\nThis is a test email from OrdoVertex.',
      description: 'Email body content'
    },
    {
      name: 'attachments',
      displayName: 'Attachments',
      type: 'json',
      default: [],
      description: 'Array of {filename, content (base64), path, or url}'
    }
  ],
  execute: async (context) => {
    try {
      const useCredential = context.getNodeParameter('useCredential', true) as boolean;
      const from = context.getNodeParameter('from', '') as string;
      const to = context.getNodeParameter('to', '') as string;
      const cc = context.getNodeParameter('cc', '') as string;
      const bcc = context.getNodeParameter('bcc', '') as string;
      const subject = context.getNodeParameter('subject', '') as string;
      const bodyType = context.getNodeParameter('bodyType', 'text') as string;
      let body = context.getNodeParameter('body', '') as string;
      const attachments = context.getNodeParameter('attachments', []) as any[];

      // Simple template replacement
      const items = context.getInputData();
      const item = items[0]?.json || {};
      
      const replaceVars = (str: string) => {
        return str.replace(/\{\{\s*\$input\.(\w+)\s*\}\}/g, (_, key) => {
          return item[key] || '';
        });
      };

      let transporterConfig: any;

      if (useCredential) {
        // Get credential from store
        const { prisma } = await import('../../prisma');
        const { decryptJSON } = await import('../../utils/encryption');
        
        const credentialId = context.getNodeParameter('credentialId', '') as string;
        const credential = await prisma.credential.findFirst({
          where: { id: credentialId, userId: context.userId }
        });
        
        if (!credential) {
          throw new Error('SMTP credential not found');
        }
        
        const credData = decryptJSON(credential.data, credential.iv);
        
        transporterConfig = {
          host: credData.host,
          port: credData.port || 587,
          secure: credData.secure || false,
          auth: {
            user: credData.user,
            pass: credData.password
          }
        };
      } else {
        transporterConfig = {
          host: context.getNodeParameter('smtpHost', 'smtp.gmail.com') as string,
          port: context.getNodeParameter('smtpPort', 587) as number,
          secure: context.getNodeParameter('smtpSecure', false) as boolean,
          auth: {
            user: context.getNodeParameter('smtpUser', '') as string,
            pass: context.getNodeParameter('smtpPassword', '') as string
          }
        };
      }

      const transporter = nodemailer.createTransport(transporterConfig);

      // Convert markdown to simple HTML if needed
      let html: string | undefined;
      let text: string | undefined;

      if (bodyType === 'markdown') {
        // Simple markdown conversion
        html = body
          .replace(/^### (.*$)/gim, '<h3>$1</h3>')
          .replace(/^## (.*$)/gim, '<h2>$1</h2>')
          .replace(/^# (.*$)/gim, '<h1>$1</h1>')
          .replace(/\*\*(.*)\*\*/gim, '<b>$1</b>')
          .replace(/\*(.*)\*/gim, '<i>$1</i>')
          .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2">$1</a>')
          .replace(/\n/gim, '<br>');
        text = body;
      } else if (bodyType === 'html') {
        html = replaceVars(body);
      } else {
        text = replaceVars(body);
      }

      const mailOptions: any = {
        from: replaceVars(from),
        to: replaceVars(to),
        subject: replaceVars(subject),
        text,
        html
      };

      if (cc) mailOptions.cc = replaceVars(cc);
      if (bcc) mailOptions.bcc = replaceVars(bcc);

      if (attachments && attachments.length > 0) {
        mailOptions.attachments = attachments.map(att => ({
          filename: att.filename,
          content: att.content,
          path: att.path,
          href: att.url
        }));
      }

      const info = await transporter.sendMail(mailOptions);

      return {
        success: true,
        output: [{
          json: {
            messageId: info.messageId,
            accepted: info.accepted,
            rejected: info.rejected,
            response: info.response
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
              sent: false
            }
          }]
        };
      }
      throw error;
    }
  }
};
