import { NodeType } from '../../types';
import { getErrorMessage } from '../../utils/error-helper';
import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';

export const s3TriggerNode: NodeType = {
  name: 's3Trigger',
  displayName: 'S3 Bucket Watch',
  description: 'Trigger on new or modified files in S3 bucket',
  icon: 'fa:aws',
  category: 'Triggers',
  version: 1,
  inputs: [],
  outputs: [
    {
      name: 'output',
      type: 'all',
      description: 'S3 object information'
    }
  ],
  properties: [
    {
      name: 'useCredential',
      displayName: 'Use Credential',
      type: 'boolean',
      default: true,
      description: 'Use saved AWS credentials'
    },
    {
      name: 'credentialId',
      displayName: 'AWS Credential',
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
      name: 'accessKeyId',
      displayName: 'Access Key ID',
      type: 'string',
      displayOptions: {
        show: {
          useCredential: [false]
        }
      }
    },
    {
      name: 'secretAccessKey',
      displayName: 'Secret Access Key',
      type: 'string',
      sensitive: true,
      displayOptions: {
        show: {
          useCredential: [false]
        }
      }
    },
    {
      name: 'region',
      displayName: 'Region',
      type: 'string',
      default: 'us-east-1',
      required: true
    },
    {
      name: 'bucket',
      displayName: 'Bucket Name',
      type: 'string',
      default: '',
      required: true,
      description: 'S3 bucket to watch'
    },
    {
      name: 'prefix',
      displayName: 'Prefix (Folder)',
      type: 'string',
      default: '',
      description: 'Only watch objects with this prefix (e.g., incoming/)'
    },
    {
      name: 'suffix',
      displayName: 'Suffix Filter',
      type: 'string',
      default: '',
      placeholder: '.csv,.json',
      description: 'Only watch files with these extensions (comma-separated)'
    },
    {
      name: 'maxFiles',
      displayName: 'Max Files Per Run',
      type: 'number',
      default: 10,
      description: 'Maximum objects to process in one execution'
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
        { name: 'Base64', value: 'base64' }
      ],
      default: 'utf8',
      displayOptions: {
        show: {
          downloadContent: [true]
        }
      }
    },
    {
      name: 'deleteAfterProcess',
      displayName: 'Delete After Process',
      type: 'boolean',
      default: false,
      description: 'Delete object from S3 after processing (use with caution!)'
    }
  ],
  execute: async (context) => {
    let s3Client: S3Client | null = null;
    
    try {
      const useCredential = context.getNodeParameter('useCredential', true) as boolean;
      const region = context.getNodeParameter('region', 'us-east-1') as string;
      const bucket = context.getNodeParameter('bucket', '') as string;
      const prefix = context.getNodeParameter('prefix', '') as string;
      const suffix = context.getNodeParameter('suffix', '') as string;
      const maxFiles = context.getNodeParameter('maxFiles', 10) as number;
      const downloadContent = context.getNodeParameter('downloadContent', false) as boolean;
      const encoding = context.getNodeParameter('encoding', 'utf8') as string;
      const deleteAfterProcess = context.getNodeParameter('deleteAfterProcess', false) as boolean;

      if (!bucket) {
        throw new Error('Bucket name is required');
      }

      let credentials: { accessKeyId: string; secretAccessKey: string } | undefined;

      if (useCredential) {
        const { prisma } = await import('../../prisma');
        const { decryptJSON } = await import('../../utils/encryption');
        
        const credentialId = context.getNodeParameter('credentialId', '') as string;
        const credential = await prisma.credential.findFirst({
          where: { id: credentialId, userId: context.userId }
        });
        
        if (!credential) {
          throw new Error('AWS credential not found');
        }
        
        const credData = decryptJSON(credential.data, credential.iv);
        credentials = {
          accessKeyId: credData.accessKeyId,
          secretAccessKey: credData.secretAccessKey
        };
      } else {
        credentials = {
          accessKeyId: context.getNodeParameter('accessKeyId', '') as string,
          secretAccessKey: context.getNodeParameter('secretAccessKey', '') as string
        };
      }

      s3Client = new S3Client({
        region,
        credentials
      });

      // List objects
      const command = new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix || undefined,
        MaxKeys: maxFiles
      });

      const response = await s3Client.send(command);
      const objects = response.Contents || [];

      // Filter by suffix if specified
      let filteredObjects = objects;
      if (suffix) {
        const suffixes = suffix.split(',').map(s => s.trim());
        filteredObjects = objects.filter(obj => {
          const key = obj.Key || '';
          return suffixes.some(s => key.endsWith(s));
        });
      }

      const results: any[] = [];

      for (const obj of filteredObjects.slice(0, maxFiles)) {
        const result: any = {
          key: obj.Key,
          bucket: bucket,
          size: obj.Size,
          lastModified: obj.LastModified?.toISOString(),
          etag: obj.ETag,
          storageClass: obj.StorageClass
        };

        // Download content if requested and file is under 50MB
        if (downloadContent && obj.Size && obj.Size < 50 * 1024 * 1024 && obj.Key) {
          try {
            const getCommand = new GetObjectCommand({
              Bucket: bucket,
              Key: obj.Key
            });
            
            const getResponse = await s3Client.send(getCommand);
            const stream = getResponse.Body as Readable;
            
            const chunks: Buffer[] = [];
            for await (const chunk of stream) {
              chunks.push(Buffer.from(chunk));
            }
            
            const buffer = Buffer.concat(chunks);
            
            if (encoding === 'base64') {
              result.content = buffer.toString('base64');
            } else {
              result.content = buffer.toString('utf8');
            }
            result.contentType = getResponse.ContentType;
          } catch (err) {
            result.contentError = 'Failed to download content';
          }
        }

        results.push(result);

        // Delete if requested
        if (deleteAfterProcess && obj.Key) {
          const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
          await s3Client.send(new DeleteObjectCommand({
            Bucket: bucket,
            Key: obj.Key
          }));
        }
      }

      return {
        success: true,
        output: results.map(r => ({ json: r }))
      };
    } catch (error: unknown) {
      if (context.continueOnFail()) {
        return {
          success: true,
          output: [{
            json: { error: getErrorMessage(error) }
          }]
        };
      }
      throw error;
    } finally {
      if (s3Client) {
        // S3Client doesn't have a close/destroy method
      }
    }
  }
};
