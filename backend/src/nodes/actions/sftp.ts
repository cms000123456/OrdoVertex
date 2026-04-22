import { NodeType } from '../../types';
import { getErrorMessage } from '../../utils/error-helper';
import Client from 'ssh2-sftp-client';

export const sftpNode: NodeType = {
  name: 'sftp',
  displayName: 'SFTP',
  description: 'Transfer files via SFTP/SSH',
  icon: 'fa:server',
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
      default: '/home/user/file.txt',
      description: 'Path on remote server'
    },
    {
      name: 'localPath',
      displayName: 'Local/Data Path',
      type: 'string',
      default: '{{ $input.filePath }}',
      description: 'For download: where to save. For upload: field with file data',
      displayOptions: {
        hide: {
          operation: ['list', 'delete', 'mkdir']
        }
      }
    },
    {
      name: 'binary',
      displayName: 'Binary Mode',
      type: 'boolean',
      default: false,
      description: 'Treat file as binary',
      displayOptions: {
        show: {
          operation: ['download', 'upload']
        }
      }
    },
    {
      name: 'createDirectories',
      displayName: 'Create Directories',
      type: 'boolean',
      default: true,
      description: 'Create parent directories if they do not exist',
      displayOptions: {
        show: {
          operation: ['upload', 'mkdir']
        }
      }
    }
  ],
  execute: async (context) => {
    const sftp = new Client();
    
    try {
      const useCredential = context.getNodeParameter('useCredential', true) as boolean;
      const operation = context.getNodeParameter('operation', 'download') as string;
      const remotePath = context.getNodeParameter('remotePath', '') as string;
      
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

      const items = context.getInputData();
      let result: any;

      switch (operation) {
        case 'download': {
          const binary = context.getNodeParameter('binary', false) as boolean;
          const encoding = binary ? null : 'utf8';
          
          const data = await sftp.get(remotePath, encoding as any);
          
          if (binary) {
            // Return as base64
            const base64 = Buffer.from(data as Buffer).toString('base64');
            result = {
              data: base64,
              encoding: 'base64',
              remotePath
            };
          } else {
            result = {
              data: String(data),
              remotePath
            };
          }
          break;
        }
        
        case 'upload': {
          const localPath = context.getNodeParameter('localPath', '') as string;
          const binary = context.getNodeParameter('binary', false) as boolean;
          const createDirs = context.getNodeParameter('createDirectories', true) as boolean;
          
          // Get data from input field
          const data = items[0]?.json?.[localPath] || localPath;
          
          let buffer: Buffer;
          if (binary && typeof data === 'string') {
            // Assume base64 encoded
            buffer = Buffer.from(data, 'base64');
          } else {
            buffer = Buffer.from(String(data));
          }
          
          if (createDirs) {
            const dir = remotePath.substring(0, remotePath.lastIndexOf('/'));
            if (dir) await sftp.mkdir(dir, true);
          }
          
          await sftp.put(buffer, remotePath);
          result = {
            uploaded: true,
            remotePath,
            size: buffer.length
          };
          break;
        }
        
        case 'list': {
          const list = await sftp.list(remotePath);
          result = {
            path: remotePath,
            files: list.map(item => ({
              name: item.name,
              type: item.type,
              size: item.size,
              modifyTime: item.modifyTime,
              accessTime: item.accessTime,
              rights: item.rights
            }))
          };
          break;
        }
        
        case 'delete': {
          await sftp.delete(remotePath);
          result = {
            deleted: true,
            remotePath
          };
          break;
        }
        
        case 'move': {
          const newPath = context.getNodeParameter('localPath', '') as string;
          await sftp.rename(remotePath, newPath);
          result = {
            moved: true,
            from: remotePath,
            to: newPath
          };
          break;
        }
        
        case 'mkdir': {
          const createDirs = context.getNodeParameter('createDirectories', true) as boolean;
          await sftp.mkdir(remotePath, createDirs);
          result = {
            created: true,
            path: remotePath
          };
          break;
        }
        
        default:
          throw new Error(`Unknown operation: ${operation}`);
      }

      await sftp.end();

      return {
        success: true,
        output: [{
          json: result
        }]
      };
    } catch (error: unknown) {
      await sftp.end();
      
      if (context.continueOnFail()) {
        return {
          success: true,
          output: [{
            json: {
              error: getErrorMessage(error),
              success: false
            }
          }]
        };
      }
      throw error;
    }
  }
};
