import { NodeType } from '../../types';
import { SmbConnection, smbCommand, smbDownload, parseLsOutput } from '../../utils/smb-client';

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
      name: 'remotePath',
      displayName: 'Remote Path',
      type: 'string',
      default: '',
      placeholder: '\\incoming',
      description: 'Folder path within the share to watch (leave empty for share root)'
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
      description: 'Download file content (max 50 MB)'
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
      description: 'Move file to this folder after processing',
      displayOptions: {
        show: {
          deleteAfterRead: [false]
        }
      }
    }
  ],
  execute: async (context) => {
    try {
      const useCredential = context.getNodeParameter('useCredential', true) as boolean;
      const remotePath = (context.getNodeParameter('remotePath', '') as string)
        .replace(/\//g, '\\').replace(/^\\+/, '').replace(/\\+$/, '');
      const pattern = context.getNodeParameter('pattern', '*') as string;
      const maxFiles = context.getNodeParameter('maxFiles', 10) as number;
      const downloadContent = context.getNodeParameter('downloadContent', false) as boolean;
      const encoding = context.getNodeParameter('encoding', 'utf8') as string;
      const deleteAfterRead = context.getNodeParameter('deleteAfterRead', false) as boolean;
      const moveAfterRead = (context.getNodeParameter('moveAfterRead', '') as string)
        .replace(/\//g, '\\').replace(/^\\+/, '').replace(/\\+$/, '');

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

      const listCmd = remotePath ? `cd "${remotePath}"; ls` : 'ls';
      const output = await smbCommand(conn, listCmd);
      const allEntries = parseLsOutput(output);

      const patternRegex = pattern !== '*'
        ? new RegExp('^' + pattern.replace(/\./g, '\\.').replace(/\*/g, '.*').replace(/\?/g, '.') + '$', 'i')
        : null;

      const matchedFiles: any[] = [];

      for (const entry of allEntries) {
        if (matchedFiles.length >= maxFiles) break;
        if (patternRegex && !patternRegex.test(entry)) continue;

        const filePath = remotePath ? `${remotePath}\\${entry}` : entry;
        const fileInfo: any = {
          name: entry,
          path: filePath,
          share: `//${conn.host}/${conn.share}`
        };

        if (downloadContent) {
          try {
            const buffer = await smbDownload(conn, filePath);
            if (buffer.length <= 50 * 1024 * 1024) {
              fileInfo.content = encoding === 'base64'
                ? buffer.toString('base64')
                : buffer.toString('utf8');
              fileInfo.size = buffer.length;
            } else {
              fileInfo.contentError = 'File exceeds 50 MB limit';
            }
          } catch (err: any) {
            fileInfo.contentError = `Failed to download content: ${err.message}`;
          }
        }

        matchedFiles.push(fileInfo);

        if (deleteAfterRead) {
          await smbCommand(conn, `del "${filePath}"`).catch(() => {});
        } else if (moveAfterRead) {
          const destPath = `${moveAfterRead}\\${entry}`;
          await smbCommand(conn, `rename "${filePath}" "${destPath}"`).catch(() => {});
        }
      }

      return { success: true, output: matchedFiles.map(f => ({ json: f })) };
    } catch (error: any) {
      if (context.continueOnFail()) {
        return { success: true, output: [{ json: { error: error.message } }] };
      }
      throw error;
    }
  }
};
