import { NodeType } from '../../types';
import { PythonShell } from 'python-shell';

export const codeNode: NodeType = {
  name: 'code',
  displayName: 'Code',
  description: 'Execute custom JavaScript or Python code',
  icon: 'fa:code',
  category: 'Actions',
  version: 1,
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
      description: 'JavaScript code to execute. Use "items" to access input data. Return an array.',
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
      description: 'Python code to execute. Use "items" to access input data. Return a list.',
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
    }
  ],
  execute: async (context) => {
    try {
      const language = context.getNodeParameter('language', 'javascript') as string;
      const executeOnce = context.getNodeParameter('executeOnce', false) as boolean;
      const items = context.getInputData();

      if (language === 'python') {
        return executePython(context, items, executeOnce);
      } else {
        return executeJavaScript(context, items, executeOnce);
      }
    } catch (error: any) {
      if (context.continueOnFail()) {
        return {
          success: true,
          output: [{
            json: {
              error: error.message,
              // Only include stack trace in development mode
              ...(process.env.NODE_ENV !== 'production' && { stack: error.stack })
            }
          }]
        };
      }
      throw new Error(`Code execution failed: ${error.message}`);
    }
  }
};

async function executeJavaScript(context: any, items: any[], executeOnce: boolean) {
  const code = context.getNodeParameter('code', '') as string;

  if (!code.trim()) {
    return {
      success: true,
      output: items
    };
  }

  // Create a sandboxed execution context
  const sandbox = {
    items: executeOnce ? [items[0] || { json: {} }] : items,
    console: {
      log: (...args: any[]) => console.log('[Code Node]', ...args),
      error: (...args: any[]) => console.error('[Code Node]', ...args)
    },
    Math,
    JSON,
    Date,
    Array,
    Object,
    String,
    Number,
    Boolean,
    RegExp,
    Error,
    Promise,
    Set,
    Map,
    Buffer,
    parseInt,
    parseFloat,
    isNaN,
    isFinite,
    encodeURI,
    decodeURI,
    encodeURIComponent,
    decodeURIComponent,
    escape,
    unescape,
    btoa: (str: string) => Buffer.from(str).toString('base64'),
    atob: (str: string) => Buffer.from(str, 'base64').toString('utf8'),
    // Helper functions
    $: {
      // Access item at index
      item: (index: number = 0) => items[index]?.json || {},
      // All items
      all: () => items,
      // First item
      first: () => items[0]?.json || {},
      // Last item
      last: () => items[items.length - 1]?.json || {}
    }
  };

  // Create function from code
  const fn = new Function(
    'items', 'console', 'Math', 'JSON', 'Date', 'Array', 'Object',
    'String', 'Number', 'Boolean', 'RegExp', 'Error', 'Promise', 'Set', 'Map',
    'Buffer', 'parseInt', 'parseFloat', 'isNaN', 'isFinite',
    'encodeURI', 'decodeURI', 'encodeURIComponent', 'decodeURIComponent',
    'escape', 'unescape', 'btoa', 'atob', '$',
    `"use strict";
${code}`
  );

  const result = fn(
    sandbox.items, sandbox.console, sandbox.Math, sandbox.JSON, sandbox.Date,
    sandbox.Array, sandbox.Object, sandbox.String, sandbox.Number, sandbox.Boolean,
    sandbox.RegExp, sandbox.Error, sandbox.Promise, sandbox.Set, sandbox.Map,
    sandbox.Buffer, sandbox.parseInt, sandbox.parseFloat, sandbox.isNaN, sandbox.isFinite,
    sandbox.encodeURI, sandbox.decodeURI, sandbox.encodeURIComponent, sandbox.decodeURIComponent,
    sandbox.escape, sandbox.unescape, sandbox.btoa, sandbox.atob, sandbox.$
  );

  // Normalize result
  let output: any[];
  if (Array.isArray(result)) {
    output = result.map(item => {
      if (item && typeof item === 'object') {
        if (item.json) return item;
        return { json: item };
      }
      return { json: { value: item } };
    });
  } else if (result && typeof result === 'object') {
    if (result.json) {
      output = [result];
    } else {
      output = [{ json: result }];
    }
  } else {
    output = [{ json: { value: result } }];
  }

  return {
    success: true,
    output
  };
}

async function executePython(context: any, items: any[], executeOnce: boolean) {
  const code = context.getNodeParameter('pythonCode', '') as string;

  if (!code.trim()) {
    return {
      success: true,
      output: items
    };
  }

  const inputData = executeOnce ? [items[0] || { json: {} }] : items;

  // Wrap user code to handle input/output
  const pythonScript = `
import sys
import json

# Input data from Node.js
items = json.loads('''${JSON.stringify(inputData).replace(/'/g, "\\'")}''')

# Helper functions
def get_item(index=0):
    return items[index]['json'] if index < len(items) else {}

def get_all():
    return items

def get_first():
    return items[0]['json'] if items else {}

def get_last():
    return items[-1]['json'] if items else {}

# User code
${code}

# Output results
if 'results' in dir():
    print("___ORDOVERTEX_OUTPUT_START___")
    print(json.dumps(results))
    print("___ORDOVERTEX_OUTPUT_END___")
elif 'result' in dir():
    print("___ORDOVERTEX_OUTPUT_START___")
    print(json.dumps(result))
    print("___ORDOVERTEX_OUTPUT_END___")
else:
    # Try to find the last expression or variable
    print("___ORDOVERTEX_OUTPUT_START___")
    print(json.dumps(None))
    print("___ORDOVERTEX_OUTPUT_END___")
`;

  return new Promise((resolve, reject) => {
    const pyshell = new PythonShell('script.py', {
      mode: 'text',
      pythonPath: 'python3',
      scriptPath: '/tmp',
      args: []
    });

    let output = '';
    let errorOutput = '';
    let jsonResult: any = null;

    pyshell.on('message', (message) => {
      output += message + '\n';
      
      // Check for our output markers
      if (message.includes('___ORDOVERTEX_OUTPUT_START___')) {
        jsonResult = 'pending';
      } else if (jsonResult === 'pending' && message.includes('___ORDOVERTEX_OUTPUT_END___')) {
        jsonResult = 'done';
      } else if (jsonResult === 'pending') {
        try {
          jsonResult = JSON.parse(message);
        } catch (e) {
          // Not valid JSON yet
        }
      }
    });

    pyshell.on('stderr', (stderr) => {
      errorOutput += stderr + '\n';
      console.log('[Python Code Node]', stderr);
    });

    pyshell.on('error', (err) => {
      reject(new Error(`Python execution error: ${err.message}`));
    });

    pyshell.on('close', () => {
      if (errorOutput && !jsonResult) {
        reject(new Error(`Python error: ${errorOutput}`));
        return;
      }

      // Normalize result
      let finalOutput: any[];
      
      if (jsonResult && typeof jsonResult === 'object') {
        if (Array.isArray(jsonResult)) {
          finalOutput = jsonResult.map((item: any) => {
            if (item && typeof item === 'object') {
              if (item.json) return item;
              return { json: item };
            }
            return { json: { value: item } };
          });
        } else {
          if (jsonResult.json) {
            finalOutput = [jsonResult];
          } else {
            finalOutput = [{ json: jsonResult }];
          }
        }
      } else {
        finalOutput = [{ json: { value: jsonResult } }];
      }

      resolve({
        success: true,
        output: finalOutput
      });
    });

    // Send the script to Python
    pyshell.send(pythonScript);
    pyshell.end();
  });
}
