import { NodeType } from '../../types';
import { 
  executeSandboxedJavaScript, 
  executeSandboxedPython,
  workflowContainsCodeNodes 
} from '../../utils/code-sandbox';

/**
 * Code Node - Secure Code Execution
 * 
 * SECURITY NOTICE: This node executes user-provided code. The following security
 * measures are in place:
 * 
 * 1. JavaScript execution uses vm2 sandbox with NO Node.js API access
 * 2. Python execution restricts imports to a whitelist of safe modules
 * 3. Static analysis blocks dangerous patterns (file system, network, eval, etc.)
 * 4. Execution timeout (30 seconds default)
 * 5. Output size limits (10 MB)
 * 6. In production, workflows with code nodes require admin approval
 * 
 * Blocked JavaScript patterns:
 * - require() of any Node.js modules
 * - Access to process, global, __dirname, __filename, module, exports
 * - eval(), Function(), setTimeout/setInterval
 * - __proto__ and prototype pollution attempts
 * 
 * Blocked Python patterns:
 * - File operations (open, read, write)
 * - System commands (os, sys, subprocess)
 * - Network access (socket, urllib, http)
 * - Code execution (eval, exec, compile)
 * 
 * Allowed Python modules (whitelist):
 * - json, math, random, datetime, time, re, string
 * - collections, itertools, functools, statistics
 * - decimal, fractions, numbers, typing
 * - hashlib (limited), base64, uuid, copy, pprint
 */

export const codeNode: NodeType = {
  name: 'code',
  displayName: 'Code',
  description: 'Execute custom JavaScript or Python code in a secure sandbox',
  icon: 'fa:code',
  category: 'Actions',
  version: 2, // Bumped version for security update
  inputs: [
    {
      name: 'input',
      type: 'all',
      description: 'Input data'
    }
  ],
  outputs: [
    {
      name: 'output',
      type: 'all',
      description: 'Code execution output'
    }
  ],
  properties: [
    {
      name: 'language',
      displayName: 'Language',
      type: 'options',
      options: [
        { name: 'JavaScript', value: 'javascript' },
        { name: 'Python', value: 'python' }
      ],
      default: 'javascript',
      description: 'Programming language'
    },
    {
      name: 'code',
      displayName: 'JavaScript Code',
      type: 'multiline',
      default: `// Access input data with: items
// Return an array of objects

// Example: Transform input
const results = items.map(item => {
  return {
    json: {
      ...item.json,
      processed: true,
      timestamp: new Date().toISOString()
    }
  };
});

return results;`,
      description: 'JavaScript code to execute. Use "items" to access input data. Return an array. File system and network access are blocked.',
      required: true,
      displayOptions: {
        show: {
          language: ['javascript']
        }
      }
    },
    {
      name: 'pythonCode',
      displayName: 'Python Code',
      type: 'multiline',
      default: `# Access input data with: items (list of dictionaries)
# Return a list of dictionaries

import json
from datetime import datetime

# Example: Transform input
results = []
for item in items:
    result = {
        **item['json'],
        'processed': True,
        'timestamp': datetime.now().isoformat()
    }
    results.append({'json': result})

# Print for debugging
print(f"Processed {len(results)} items")

# Return results
results`,
      description: 'Python code to execute. Use "items" to access input data. Only standard library modules allowed (no file/network access).',
      required: true,
      displayOptions: {
        show: {
          language: ['python']
        }
      }
    },
    {
      name: 'executeOnce',
      displayName: 'Execute Once',
      type: 'boolean',
      default: false,
      description: 'Run code only once regardless of input items count'
    },
    {
      name: 'timeout',
      displayName: 'Timeout (ms)',
      type: 'number',
      default: 30000,
      min: 1000,
      max: 300000, // 5 minutes max
      description: 'Maximum execution time in milliseconds (1000-300000)'
    }
  ],
  execute: async (context) => {
    try {
      const language = context.getNodeParameter('language', 'javascript') as string;
      const executeOnce = context.getNodeParameter('executeOnce', false) as boolean;
      const timeout = context.getNodeParameter('timeout', 30000) as number;
      const items = context.getInputData();

      // Note: Code execution is sandboxed and safe.
      // Workflow creation/update with code nodes is controlled by system settings.
      console.log(`[Security] Code execution by user ${context.userId || 'unknown'}`);

      let result: { success: boolean; output: any[]; error?: string };

      if (language === 'python') {
        const code = context.getNodeParameter('pythonCode', '') as string;
        result = await executeSandboxedPython(code, items, { 
          timeout: Math.min(timeout, 300000),
          executeOnce 
        });
      } else {
        const code = context.getNodeParameter('code', '') as string;
        result = executeSandboxedJavaScript(code, items, { 
          timeout: Math.min(timeout, 300000),
          executeOnce 
        });
      }

      if (!result.success) {
        throw new Error(result.error || 'Code execution failed');
      }

      return {
        success: true,
        output: result.output
      };

    } catch (error: any) {
      console.error('[Code Node] Execution error:', error);
      
      if (context.continueOnFail()) {
        return {
          success: true,
          output: [{
            json: {
              error: error.message,
              // Only include details in development
              ...(process.env.NODE_ENV !== 'production' && { 
                stack: error.stack,
                details: error.toString()
              })
            }
          }]
        };
      }
      
      throw new Error(`Code execution failed: ${error.message}`);
    }
  }
};

// Export helper for workflow validation
export { workflowContainsCodeNodes };
