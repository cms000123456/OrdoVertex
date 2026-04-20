import { NodeType } from '../../types';
import SMB2 from '@marsaud/smb2';

export const smbTriggerNode: NodeType = {
  name: 'smbTrigger',
  displayName: 'SMB/CIFS Watch',
  description: 'Poll an SMB/CIFS share for new or modified files',
  icon: 'fa:folder-open',
  category: 'Triggers',
  version: 1,
  inputs: [],
  outputs: [
    {
      name: 'output',
      type: 'all',
      description: 'File information from SMB share'
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
      name: 'remotePath',
      displayName: 'Remote Path',
      type: 'string',
      default: '\\',
      placeholder: '\\incoming',
      description: 'Folder path within the share to watch'
    },
    {
      name: 'pattern',
      displayName: 'File Pattern',
      type: 'string',
      default: '*',
      description: 'Glob pattern to match files (e.g., *.csv)'
    },
    {
      name: 'maxFiles',
      displayName: 'Max Files Per Run',
      type: 'number',
      default: 10,
      description: 'Maximum files to process in one execution'
    },
    {
      name: 'downloadContent',
      displayName: 'Download Content',
      type: 'boolean',
      default: false,
      description: 'Download file content (max 50MB)'
    },
    {
      name: 'encoding',
      displayName: 'Encoding',
      type: 'options',
      options: [
        { name: 'UTF-8', value: 'utf8' },
        { name: 'Base64', value: 'base64' },
        { name: 'Binary', value: 'binary' }
      ],
      default: 'utf8',
      displayOptions: {
        show: {
          downloadContent: [true]
        }
      }
    },
    {
      name: 'deleteAfterRead',
      displayName: 'Delete After Read',
      type: 'boolean',
      default: false,
      description: 'Delete file from share after processing (use with caution!)'
    },
    {
      name: 'moveAfterRead',
      displayName: 'Move After Read',
      type: 'string',
      default: '',
      placeholder: '\\processed',
      description: 'Move file to this folder after processing (instead of deleting)',
      displayOptions: {
        show: {
          deleteAfterRead: [false]
        }
      }
    }
  ],
  execute: async (context) => {
    let smb: SMB2 | null = null;

    try {
      const useCredential = context.getNodeParameter('useCredential', true) as boolean;
      const remotePath = context.getNodeParameter('remotePath', '\\') as string;
      const pattern = context.getNodeParameter('pattern', '*') as string;
      const maxFiles = context.getNodeParameter('maxFiles', 10) as number;
      const downloadContent = context.getNodeParameter('downloadContent', false) as boolean;
      const encoding = context.getNodeParameter('encoding', 'utf8') as string;
      const deleteAfterRead = context.getNodeParameter('deleteAfterRead', false) as boolean;
      const moveAfterRead = context.getNodeParameter('moveAfterRead', '') as string;

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

      const normalizedPath = remotePath.replace(/\//g, '\\').replace(/^\\+/, '').replace(/\\+$/, '');
      const entries = await smb.readdir(normalizedPath || '');
      const matchedFiles: any[] = [];

      const patternRegex = pattern !== '*'
        ? new RegExp('^' + pattern.replace(/\./g, '\\.').replace(/\*/g, '.*').replace(/\?/g, '.') + '$', 'i')
        : null;

      for (const entry of entries.slice(0, maxFiles * 3)) {
        if (matchedFiles.length >= maxFiles) break;

        if (typeof entry !== 'string') continue;

        if (patternRegex && !patternRegex.test(entry)) continue;

        const filePath = normalizedPath ? `${normalizedPath}\\${entry}` : entry;

        const fileInfo: any = {
          name: entry,
          path: filePath,
          share: `\\\\${host}\\${share}`
        };

        if (downloadContent) {
          try {
            const buffer = await smb.readFile(filePath) as Buffer;
            if (buffer.length <= 50 * 1024 * 1024) {
              if (encoding === 'base64') {
                fileInfo.content = buffer.toString('base64');
              } else if (encoding === 'binary') {
                fileInfo.content = buffer;
              } else {
                fileInfo.content = buffer.toString('utf8');
              }
              fileInfo.size = buffer.length;
            } else {
              fileInfo.contentError = 'File exceeds 50MB limit';
            }
          } catch (err) {
            fileInfo.contentError = 'Failed to download content';
          }
        }

        matchedFiles.push(fileInfo);

        if (deleteAfterRead) {
          await smb.unlink(filePath);
        } else if (moveAfterRead) {
          const destDir = moveAfterRead.replace(/\//g, '\\').replace(/^\\+/, '').replace(/\\+$/, '');
          const destPath = `${destDir}\\${entry}`;
          await smb.rename(filePath, destPath);
        }
      }

      smb.disconnect();

      return {
        success: true,
        output: matchedFiles.map(f => ({ json: f }))
      };
    } catch (error: any) {
      if (smb) {
        try { smb.disconnect(); } catch (_) {}
      }

      if (context.continueOnFail()) {
        return {
          success: true,
          output: [{ json: { error: error.message } }]
        };
      }
      throw error;
    }
  }
};
