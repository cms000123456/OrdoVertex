import { NodeType } from '../../types';
import fs from 'fs/promises';
import path from 'path';

export const fileWatchTriggerNode: NodeType = {
  name: 'fileWatch',
  displayName: 'File Watch',
  description: 'Trigger when files are created or modified in a folder',
  icon: 'fa:folder-open',
  category: 'Triggers',
  version: 1,
  inputs: [],
  outputs: [
    {
      name: 'output',
      type: 'all',
      description: 'File information'
    }
  ],
  properties: [
    {
      name: 'folderPath',
      displayName: 'Folder Path',
      type: 'string',
      default: '/data/incoming',
      required: true,
      description: 'Absolute path to watch'
    },
    {
      name: 'pattern',
      displayName: 'File Pattern',
      type: 'string',
      default: '*',
      description: 'Glob pattern to match files (e.g., *.csv, *.json)'
    },
    {
      name: 'event',
      displayName: 'Trigger On',
      type: 'options',
      options: [
        { name: 'All Files', value: 'all' },
        { name: 'New Files Only', value: 'created' }
      ],
      default: 'all',
      description: 'Which file events to trigger on'
    },
    {
      name: 'readContent',
      displayName: 'Read File Content',
      type: 'boolean',
      default: false,
      description: 'Include file content in output'
    },
    {
      name: 'encoding',
      displayName: 'Encoding',
      type: 'options',
      options: [
        { name: 'UTF-8', value: 'utf8' },
        { name: 'Base64', value: 'base64' },
        { name: 'Binary (Buffer)', value: 'buffer' }
      ],
      default: 'utf8',
      description: 'How to read file content',
      displayOptions: {
        show: {
          readContent: [true]
        }
      }
    },
    {
      name: 'deleteAfterRead',
      displayName: 'Delete After Read',
      type: 'boolean',
      default: false,
      description: 'Delete file after processing (use with caution!)'
    },
    {
      name: 'maxFilesPerRun',
      displayName: 'Max Files Per Run',
      type: 'number',
      default: 10,
      description: 'Maximum files to process in one execution'
    }
  ],
  execute: async (context) => {
    try {
      const folderPath = context.getNodeParameter('folderPath', '') as string;
      const pattern = context.getNodeParameter('pattern', '*') as string;
      const readContent = context.getNodeParameter('readContent', false) as boolean;
      const encoding = context.getNodeParameter('encoding', 'utf8') as string;
      const deleteAfterRead = context.getNodeParameter('deleteAfterRead', false) as boolean;
      const maxFiles = context.getNodeParameter('maxFilesPerRun', 10) as number;

      // Path Traversal Protection
      // Resolve the absolute path and ensure it doesn't escape allowed directories
      const resolvedPath = path.resolve(folderPath);
      
      // Get allowed base directories from env or use defaults
      const allowedDirs = process.env.ALLOWED_WATCH_DIRECTORIES 
        ? process.env.ALLOWED_WATCH_DIRECTORIES.split(',').map(d => path.resolve(d.trim()))
        : [path.resolve('/data'), path.resolve(process.cwd(), 'data')];
      
      // Check if resolved path is within allowed directories
      const isAllowed = allowedDirs.some(allowedDir => 
        resolvedPath === allowedDir || resolvedPath.startsWith(allowedDir + path.sep)
      );
      
      if (!isAllowed) {
        throw new Error(`Access denied: Path '${folderPath}' is outside allowed directories. ` +
          `Allowed directories: ${allowedDirs.join(', ')}. ` +
          `Set ALLOWED_WATCH_DIRECTORIES env var to customize.`);
      }

      // Check if folder exists
      try {
        await fs.access(resolvedPath);
      } catch {
        throw new Error(`Folder does not exist: ${folderPath}`);
      }

      // Get all files in directory
      const files = await fs.readdir(resolvedPath);
      const matchedFiles: Array<{
        name: string;
        path: string;
        size: number;
        modifiedTime: Date;
        createdTime: Date;
        content?: string | Buffer;
      }> = [];

      for (const filename of files.slice(0, maxFiles)) {
        const filePath = path.join(resolvedPath, filename);
        
        // Additional path traversal check for individual files
        const resolvedFilePath = path.resolve(filePath);
        if (!resolvedFilePath.startsWith(resolvedPath + path.sep) && resolvedFilePath !== resolvedPath) {
          continue; // Skip files that would escape the directory
        }
        
        // Check pattern match (simple glob)
        if (pattern !== '*') {
          const regex = new RegExp('^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$');
          if (!regex.test(filename)) continue;
        }

        try {
          const stats = await fs.stat(filePath);
          
          if (stats.isFile()) {
            const fileInfo: any = {
              name: filename,
              path: filePath,
              size: stats.size,
              modifiedTime: stats.mtime,
              createdTime: stats.birthtime
            };

            if (readContent && stats.size < 50 * 1024 * 1024) { // Max 50MB
              const content = await fs.readFile(filePath);
              
              if (encoding === 'utf8') {
                fileInfo.content = content.toString('utf8');
              } else if (encoding === 'base64') {
                fileInfo.content = content.toString('base64');
              } else {
                fileInfo.content = content; // Buffer
              }
            }

            matchedFiles.push(fileInfo);

            if (deleteAfterRead) {
              await fs.unlink(filePath);
            }
          }
        } catch (err) {
          // Skip files we can't read
          continue;
        }
      }

      if (matchedFiles.length === 0) {
        return {
          success: true,
          output: []
        };
      }

      return {
        success: true,
        output: matchedFiles.map(file => ({
          json: file
        }))
      };
    } catch (error: any) {
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
