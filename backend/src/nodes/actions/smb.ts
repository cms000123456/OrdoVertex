import { NodeType } from '../../types';
import { SmbConnection, smbCommand, smbDownload, smbUpload, parseLsOutput, validateSmbPath } from '../../utils/smb-client';

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
      name: 'authType',
      displayName: 'Auth Type',
      type: 'options',
      options: [
        { name: 'NTLMv2', value: 'ntlm' },
        { name: 'Kerberos', value: 'kerberos' }
      ],
      default: 'ntlm',
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
          useCredential: [false],
          authType: ['ntlm']
        }
      }
    },
    {
      name: 'username',
      displayName: 'Username',
      type: 'string',
      displayOptions: {
        show: {
          useCredential: [false],
          authType: ['ntlm']
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
          authType: ['ntlm']
        }
      }
    },
    {
      name: 'principal',
      displayName: 'Kerberos Principal',
      type: 'string',
      placeholder: 'user@REALM.COM',
      displayOptions: {
        show: {
          useCredential: [false],
          authType: ['kerberos']
        }
      }
    },
    {
      name: 'keytab',
      displayName: 'Keytab (base64)',
      type: 'string',
      description: 'Base64-encoded keytab file. Leave empty to use the existing ticket cache.',
      displayOptions: {
        show: {
          useCredential: [false],
          authType: ['kerberos']
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
    try {
      const useCredential = context.getNodeParameter('useCredential', true) as boolean;
      const operation = context.getNodeParameter('operation', 'download') as string;
      const remotePath = validateSmbPath(
        (context.getNodeParameter('remotePath', '') as string)
          .replace(/\//g, '\\').replace(/^\\+/, ''),
        'remotePath'
      );

      let conn: SmbConnection;

      if (useCredential) {
        const { prisma } = await import('../../prisma');
        const { decryptJSON } = await import('../../utils/encryption');

        const credentialId = context.getNodeParameter('credentialId', '') as string;
        const credential = await prisma.credential.findFirst({
          where: { id: credentialId, userId: context.userId }
        });

        if (!credential) throw new Error('SMB credential not found');

        const d = decryptJSON(credential.data, credential.iv);
        const authType = (d.authType || 'ntlm') as string;

        conn = {
          host: d.host,
          share: d.share,
          auth: authType === 'kerberos'
            ? { type: 'kerberos', principal: d.principal, keytabBase64: d.keytab || undefined }
            : { type: 'ntlm', domain: d.domain || '', username: d.username, password: d.password }
        };
      } else {
        const authType = (context.getNodeParameter('authType', 'ntlm') as string);
        conn = {
          host: context.getNodeParameter('host', '') as string,
          share: context.getNodeParameter('share', '') as string,
          auth: authType === 'kerberos'
            ? {
                type: 'kerberos',
                principal: context.getNodeParameter('principal', '') as string,
                keytabBase64: (context.getNodeParameter('keytab', '') as string) || undefined,
              }
            : {
                type: 'ntlm',
                domain: context.getNodeParameter('domain', '') as string,
                username: context.getNodeParameter('username', '') as string,
                password: context.getNodeParameter('password', '') as string,
              }
        };
      }

      const items = context.getInputData();
      let result: any;

      switch (operation) {
        case 'download': {
          const binary = context.getNodeParameter('binary', false) as boolean;
          const buffer = await smbDownload(conn, remotePath);
          result = binary
            ? { data: buffer.toString('base64'), encoding: 'base64', remotePath, size: buffer.length }
            : { data: buffer.toString('utf8'), remotePath, size: buffer.length };
          break;
        }

        case 'upload': {
          const dataField = context.getNodeParameter('data', '') as string;
          const binary = context.getNodeParameter('binary', false) as boolean;
          const rawData = items[0]?.json?.[dataField] ?? dataField;
          const buffer = binary && typeof rawData === 'string'
            ? Buffer.from(rawData, 'base64')
            : Buffer.from(String(rawData));
          await smbUpload(conn, remotePath, buffer);
          result = { uploaded: true, remotePath, size: buffer.length };
          break;
        }

        case 'list': {
          const dir = remotePath ? `cd "${remotePath}"; ls` : 'ls';
          const output = await smbCommand(conn, dir);
          result = { path: remotePath, files: parseLsOutput(output) };
          break;
        }

        case 'delete': {
          await smbCommand(conn, `del "${remotePath}"`);
          result = { deleted: true, remotePath };
          break;
        }

        case 'move': {
          const newPath = validateSmbPath(
            (context.getNodeParameter('newPath', '') as string)
              .replace(/\//g, '\\').replace(/^\\+/, ''),
            'newPath'
          );
          await smbCommand(conn, `rename "${remotePath}" "${newPath}"`);
          result = { moved: true, from: remotePath, to: newPath };
          break;
        }

        case 'mkdir': {
          await smbCommand(conn, `mkdir "${remotePath}"`);
          result = { created: true, path: remotePath };
          break;
        }

        default:
          throw new Error(`Unknown operation: ${operation}`);
      }

      return { success: true, output: [{ json: result }] };
    } catch (error: any) {
      if (context.continueOnFail()) {
        return { success: true, output: [{ json: { error: error.message, success: false } }] };
      }
      throw error;
    }
  }
};
