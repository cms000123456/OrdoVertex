import { NodeType } from '../../types';
import SMB2 from '@marsaud/smb2';

export const smbNode: NodeType = {
  name: 'smb',
  displayName: 'SMB/CIFS',
  description: 'Read and write files on an SMB/CIFS share',
  icon: 'fa:folder-open',
  category: 'Actions',
  version: 1,
  inputs: [
    {
      name: 'input',
      type: 'all',
      description: 'Input data with file info'
    }
  ],
  outputs: [
    {
      name: 'output',
      type: 'all',
      description: 'Operation result'
    }
  ],
  properties: [
    {
      name: 'useCredential',
      displayName: 'Use Credential',
      type: 'boolean',
      default: true,
      description: 'Use saved SMB credentials'
    },
    {
      name: 'credentialId',
      displayName: 'SMB Credential',
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
      name: 'host',
      displayName: 'Host',
      type: 'string',
      default: '',
      placeholder: '192.168.1.10',
      displayOptions: {
        show: {
          useCredential: [false]
        }
      }
    },
    {
      name: 'share',
      displayName: 'Share Name',
      type: 'string',
      default: '',
      placeholder: 'shared',
      description: 'SMB share name (without backslashes)',
      displayOptions: {
        show: {
          useCredential: [false]
        }
      }
    },
    {
      name: 'domain',
      displayName: 'Domain',
      type: 'string',
      default: '',
      placeholder: 'WORKGROUP',
      displayOptions: {
        show: {
          useCredential: [false]
        }
      }
    },
    {
      name: 'username',
      displayName: 'Username',
      type: 'string',
      displayOptions: {
        show: {
          useCredential: [false]
        }
      }
    },
    {
      name: 'password',
      displayName: 'Password',
      type: 'string',
      displayOptions: {
        show: {
          useCredential: [false]
        }
      }
    },
    {
      name: 'operation',
      displayName: 'Operation',
      type: 'options',
      options: [
        { name: 'Download', value: 'download' },
        { name: 'Upload', value: 'upload' },
        { name: 'List Directory', value: 'list' },
        { name: 'Delete File', value: 'delete' },
        { name: 'Move/Rename', value: 'move' },
        { name: 'Create Directory', value: 'mkdir' }
      ],
      default: 'download'
    },
    {
      name: 'remotePath',
      displayName: 'Remote Path',
      type: 'string',
      default: '',
      placeholder: '\\reports\\file.csv',
      description: 'Path within the share'
    },
    {
      name: 'newPath',
      displayName: 'New Path',
      type: 'string',
      default: '',
      placeholder: '\\archive\\file.csv',
      description: 'Destination path for move/rename',
      displayOptions: {
        show: {
          operation: ['move']
        }
      }
    },
    {
      name: 'data',
      displayName: 'File Data',
      type: 'string',
      default: '{{ $input.content }}',
      description: 'Data to upload (field reference or literal text)',
      displayOptions: {
        show: {
          operation: ['upload']
        }
      }
    },
    {
      name: 'binary',
      displayName: 'Binary Mode',
      type: 'boolean',
      default: false,
      description: 'Treat file content as Base64-encoded binary',
      displayOptions: {
        show: {
          operation: ['download', 'upload']
        }
      }
    }
  ],
  execute: async (context) => {
    let smb: SMB2 | null = null;

    try {
      const useCredential = context.getNodeParameter('useCredential', true) as boolean;
      const operation = context.getNodeParameter('operation', 'download') as string;
      const remotePath = (context.getNodeParameter('remotePath', '') as string)
        .replace(/\//g, '\\').replace(/^\\+/, '');

      let host: string;
      let share: string;
      let domain: string;
      let username: string;
      let password: string;

      if (useCredential) {
        const { PrismaClient } = await import('@prisma/client');
        const { decryptJSON } = await import('../../utils/encryption');
        const prisma = new PrismaClient();

        const credentialId = context.getNodeParameter('credentialId', '') as string;
        const credential = await prisma.credential.findFirst({
          where: { id: credentialId, userId: context.userId }
        });

        if (!credential) {
          throw new Error('SMB credential not found');
        }

        const credData = decryptJSON(credential.data, credential.iv);
        host = credData.host;
        share = credData.share;
        domain = credData.domain || '';
        username = credData.username;
        password = credData.password;
      } else {
        host = context.getNodeParameter('host', '') as string;
        share = context.getNodeParameter('share', '') as string;
        domain = context.getNodeParameter('domain', '') as string;
        username = context.getNodeParameter('username', '') as string;
        password = context.getNodeParameter('password', '') as string;
      }

      smb = new SMB2({
        share: `\\\\${host}\\${share}`,
        domain,
        username,
        password,
        autoCloseTimeout: 0
      });

      const items = context.getInputData();
      let result: any;

      switch (operation) {
        case 'download': {
          const binary = context.getNodeParameter('binary', false) as boolean;
          const buffer = await smb.readFile(remotePath) as Buffer;

          if (binary) {
            result = { data: buffer.toString('base64'), encoding: 'base64', remotePath, size: buffer.length };
          } else {
            result = { data: buffer.toString('utf8'), remotePath, size: buffer.length };
          }
          break;
        }

        case 'upload': {
          const dataField = context.getNodeParameter('data', '') as string;
          const binary = context.getNodeParameter('binary', false) as boolean;

          const rawData = items[0]?.json?.[dataField] ?? dataField;
          const buffer = binary && typeof rawData === 'string'
            ? Buffer.from(rawData, 'base64')
            : Buffer.from(String(rawData));

          await smb.writeFile(remotePath, buffer);
          result = { uploaded: true, remotePath, size: buffer.length };
          break;
        }

        case 'list': {
          const entries = await smb.readdir(remotePath || '');
          result = { path: remotePath, files: entries };
          break;
        }

        case 'delete': {
          await smb.unlink(remotePath);
          result = { deleted: true, remotePath };
          break;
        }

        case 'move': {
          const newPath = (context.getNodeParameter('newPath', '') as string)
            .replace(/\//g, '\\').replace(/^\\+/, '');
          // Use copy+delete instead of rename to avoid SMB2 FILE_DELETE_ACCESS permission issues
          const moveBuffer = await smb.readFile(remotePath) as Buffer;
          await smb.writeFile(newPath, moveBuffer);
          await smb.unlink(remotePath);
          result = { moved: true, from: remotePath, to: newPath };
          break;
        }

        case 'mkdir': {
          await smb.mkdir(remotePath);
          result = { created: true, path: remotePath };
          break;
        }

        default:
          throw new Error(`Unknown operation: ${operation}`);
      }

      smb.disconnect();

      return {
        success: true,
        output: [{ json: result }]
      };
    } catch (error: any) {
      if (smb) {
        try { smb.disconnect(); } catch (_) {}
      }

      if (context.continueOnFail()) {
        return {
          success: true,
          output: [{ json: { error: error.message, success: false } }]
        };
      }
      throw error;
    }
  }
};
