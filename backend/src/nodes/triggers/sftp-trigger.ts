import { NodeType } from '../../types';
import Client from 'ssh2-sftp-client';

export const sftpTriggerNode: NodeType = {
  name: 'sftpTrigger',
  displayName: 'SFTP Watch',
  description: 'Poll SFTP server for new or modified files',
  icon: 'fa:server',
  category: 'Triggers',
  version: 1,
  inputs: [],
  outputs: [
    {
      name: 'output',
      type: 'all',
      description: 'File information from SFTP'
    }
  ],
  properties: [
    {
      name: 'useCredential',
      displayName: 'Use Credential',
      type: 'boolean',
      default: true,
      description: 'Use saved SFTP credentials'
    },
    {
      name: 'credentialId',
      displayName: 'SFTP Credential',
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
      placeholder: 'sftp.example.com',
      displayOptions: {
        show: {
          useCredential: [false]
        }
      }
    },
    {
      name: 'port',
      displayName: 'Port',
      type: 'number',
      default: 22,
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
      name: 'authType',
      displayName: 'Authentication',
      type: 'options',
      options: [
        { name: 'Password', value: 'password' },
        { name: 'Private Key', value: 'key' }
      ],
      default: 'password',
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
          useCredential: [false],
          authType: ['password']
        }
      }
    },
    {
      name: 'privateKey',
      displayName: 'Private Key',
      type: 'multiline',
      placeholder: '-----BEGIN OPENSSH PRIVATE KEY-----',
      displayOptions: {
        show: {
          useCredential: [false],
          authType: ['key']
        }
      }
    },
    {
      name: 'passphrase',
      displayName: 'Key Passphrase',
      type: 'string',
      displayOptions: {
        show: {
          useCredential: [false],
          authType: ['key']
        }
      }
    },
    {
      name: 'remotePath',
      displayName: 'Remote Path',
      type: 'string',
      default: '/incoming',
      description: 'SFTP folder to watch'
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
      description: 'Delete file from SFTP after processing (use with caution!)'
    },
    {
      name: 'moveAfterRead',
      displayName: 'Move After Read',
      type: 'string',
      default: '',
      placeholder: '/processed',
      description: 'Move file to this folder after processing (instead of deleting)',
      displayOptions: {
        show: {
          deleteAfterRead: [false]
        }
      }
    }
  ],
  execute: async (context) => {
    const sftp = new Client();
    
    try {
      const useCredential = context.getNodeParameter('useCredential', true) as boolean;
      const remotePath = context.getNodeParameter('remotePath', '/incoming') as string;
      const pattern = context.getNodeParameter('pattern', '*') as string;
      const maxFiles = context.getNodeParameter('maxFiles', 10) as number;
      const downloadContent = context.getNodeParameter('downloadContent', false) as boolean;
      const encoding = context.getNodeParameter('encoding', 'utf8') as string;
      const deleteAfterRead = context.getNodeParameter('deleteAfterRead', false) as boolean;
      const moveAfterRead = context.getNodeParameter('moveAfterRead', '') as string;

      let config: any;

      if (useCredential) {
        const { prisma } = await import('../../prisma');
        const { decryptJSON } = await import('../../utils/encryption');
        
        const credentialId = context.getNodeParameter('credentialId', '') as string;
        const credential = await prisma.credential.findFirst({
          where: { id: credentialId, userId: context.userId }
        });
        
        if (!credential) {
          throw new Error('SFTP credential not found');
        }
        
        const credData = decryptJSON(credential.data, credential.iv);
        
        config = {
          host: credData.host,
          port: credData.port || 22,
          username: credData.username
        };
        
        if (credData.privateKey) {
          config.privateKey = credData.privateKey;
          if (credData.passphrase) config.passphrase = credData.passphrase;
        } else {
          config.password = credData.password;
        }
      } else {
        config = {
          host: context.getNodeParameter('host', '') as string,
          port: context.getNodeParameter('port', 22) as number,
          username: context.getNodeParameter('username', '') as string
        };
        
        const authType = context.getNodeParameter('authType', 'password') as string;
        
        if (authType === 'key') {
          config.privateKey = context.getNodeParameter('privateKey', '') as string;
          const passphrase = context.getNodeParameter('passphrase', '') as string;
          if (passphrase) config.passphrase = passphrase;
        } else {
          config.password = context.getNodeParameter('password', '') as string;
        }
      }

      await sftp.connect(config);

      // List files
      const files = await sftp.list(remotePath);
      const matchedFiles: any[] = [];

      for (const file of files.slice(0, maxFiles)) {
        // Skip directories
        if (file.type !== '-') continue;
        
        // Check pattern
        if (pattern !== '*') {
          const regex = new RegExp('^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$');
          if (!regex.test(file.name)) continue;
        }

        const filePath = `${remotePath}/${file.name}`.replace(/\/+/g, '/');
        
        const fileInfo: any = {
          name: file.name,
          path: filePath,
          size: file.size,
          modifiedTime: file.modifyTime,
          accessedTime: file.accessTime,
          permissions: file.rights?.user
        };

        // Download content if requested and file is under 50MB
        if (downloadContent && file.size && file.size < 50 * 1024 * 1024) {
          try {
            const buffer = await sftp.get(filePath);
            
            if (encoding === 'base64') {
              fileInfo.content = buffer.toString('base64');
            } else if (encoding === 'binary') {
              fileInfo.content = buffer; // Keep as buffer
            } else {
              fileInfo.content = buffer.toString('utf8');
            }
          } catch (err) {
            fileInfo.contentError = 'Failed to download content';
          }
        }

        matchedFiles.push(fileInfo);

        // Move or delete after processing
        if (deleteAfterRead) {
          await sftp.delete(filePath);
        } else if (moveAfterRead) {
          const newPath = `${moveAfterRead}/${file.name}`.replace(/\/+/g, '/');
          await sftp.rename(filePath, newPath);
        }
      }

      await sftp.end();

      return {
        success: true,
        output: matchedFiles.map(f => ({ json: f }))
      };
    } catch (error: any) {
      await sftp.end();
      
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
