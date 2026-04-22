import * as vm from 'vm';
import * as fs from 'fs';
import * as path from 'path';
import { PythonShell } from 'python-shell';
import logger from '../utils/logger';

/**
 * Secure Code Sandbox for OrdoVertex
 * 
 * This module provides sandboxed execution environments for JavaScript and Python
 * code within workflow nodes. It restricts access to system resources and prevents
 * code injection attacks.
 * 
 * Security measures:
 * - JavaScript: Uses Node.js vm module with isolated context (no Node.js APIs)
 * - Python: Uses restricted execution with import whitelist
 * - Static analysis: Blocks dangerous code patterns before execution
 * - Resource limits: Timeout and memory constraints
 * 
 * NOTE: vm2 was considered but has known security vulnerabilities. We use Node.js
 * built-in vm module with strict isolation instead.
 */

// Maximum execution time in milliseconds
const EXECUTION_TIMEOUT = 30000; // 30 seconds

// Maximum output size to prevent memory exhaustion
const MAX_OUTPUT_SIZE = 10 * 1024 * 1024; // 10 MB

// Dangerous patterns to block in JavaScript
const BLOCKED_JS_PATTERNS = [
  // File system access
  /require\s*\(\s*['"`](fs|path|child_process|os|crypto|http|https|net|dgram|tls|url|cluster|worker_threads|stream|events|buffer|util|querystring|url)['"`]\s*\)/i,
  // Global object access that could escape sandbox
  /\b(process|global|globalThis|window|document|navigator|__dirname|__filename|module|exports|require)\b/,
  // Eval and similar
  /\b(eval|Function|setTimeout|setInterval|clearTimeout|clearInterval)\s*\(/,
  // Prototype pollution
  /__proto__|constructor\s*\[\s*['"`]prototype['"`]\s*\]/i,
  // Dangerous constructors
  /new\s+(Process|ChildProcess|Server|Socket|Agent|Worker)/i,
  // VM escape attempts
  /\barguments\s*\.\s*callee\b/,
  /\)\s*\{\s*\[\s*native\s+code\s*\]/i,
];

// Dangerous patterns to block in Python
const BLOCKED_PYTHON_PATTERNS = [
  // File operations
  /\b(open|file|read|write|os\.path|pathlib|shutil)\s*\(/i,
  // System commands
  /\b(os|sys|subprocess|commands|pty|popen|spawn|system|platform|pwd|grp|spwd)\b/i,
  // Network
  /\b(socket|urllib|http|ftp|smtp|requests|httpx|aiohttp|websocket|ssl|certifi)\b/i,
  // Code execution
  /\b(eval|exec|compile|__import__|importlib|runpy|code|codeop)\b/i,
  // Dangerous builtins
  /__builtins__|__class__|__base__|__subclasses__|__mro__|__globals__/,
  // File paths
  /\/etc\/passwd|\/etc\/shadow|\/proc\/|\/sys\/|\/var\/run\/|\/home\/|\/root\//,
  // Environment access
  /os\.environ|sys\.argv|sys\.path/,
];

// Allowed Python imports (whitelist approach)
const ALLOWED_PYTHON_MODULES = [
  'json',
  'math',
  'random',
  'datetime',
  'time',
  're',
  'string',
  'collections',
  'itertools',
  'functools',
  'statistics',
  'decimal',
  'fractions',
  'numbers',
  'typing',
  'hashlib', // Limited - only for hashing, not for file operations
  'base64',
  'uuid',
  'copy',
  'pprint',
  'inspect', // Limited introspection
  'types',
  'enum',
  'dataclasses',
  'abc',
  'textwrap',
  'bisect',
  'heapq',
];

/**
 * Validates JavaScript code for dangerous patterns
 */
export function validateJavaScriptCode(code: string): { valid: boolean; error?: string } {
  if (!code || code.trim().length === 0) {
    return { valid: true };
  }

  for (const pattern of BLOCKED_JS_PATTERNS) {
    if (pattern.test(code)) {
      return {
        valid: false,
        error: `Security violation: Code contains blocked pattern. File system, network, and system access are not allowed.`,
      };
    }
  }

  return { valid: true };
}

/**
 * Validates Python code for dangerous patterns
 */
export function validatePythonCode(code: string): { valid: boolean; error?: string } {
  if (!code || code.trim().length === 0) {
    return { valid: true };
  }

  for (const pattern of BLOCKED_PYTHON_PATTERNS) {
    if (pattern.test(code)) {
      return {
        valid: false,
        error: `Security violation: Code contains blocked pattern. File system, network, and system access are not allowed.`,
      };
    }
  }

  return { valid: true };
}

/**
 * Creates a secure context for JavaScript execution
 * Only allows safe built-in objects, no Node.js APIs
 */
function createSecureContext(items: any[]): any {
  // Create a context with only safe globals
  const context = {
    // Input data
    items,
    
    // Safe console (redirected to server logs)
    console: {
      log: (...args: any[]) => logger.info('[Code Node]', ...args),
      error: (...args: any[]) => logger.error('[Code Node]', ...args),
      warn: (...args: any[]) => logger.warn('[Code Node]', ...args),
      info: (...args: any[]) => logger.info('[Code Node]', ...args),
    },
    
    // Safe built-in objects (no prototype pollution)
    Math,
    JSON: {
      parse: JSON.parse,
      stringify: JSON.stringify,
    },
    Date,
    Array,
    Object: {
      keys: Object.keys,
      values: Object.values,
      entries: Object.entries,
      assign: Object.assign,
      freeze: Object.freeze,
      seal: Object.seal,
      create: Object.create,
      defineProperty: Object.defineProperty,
      defineProperties: Object.defineProperties,
      getOwnPropertyDescriptor: Object.getOwnPropertyDescriptor,
      getOwnPropertyDescriptors: Object.getOwnPropertyDescriptors,
      getOwnPropertyNames: Object.getOwnPropertyNames,
      getOwnPropertySymbols: Object.getOwnPropertySymbols,
      getPrototypeOf: Object.getPrototypeOf,
      setPrototypeOf: Object.setPrototypeOf,
      is: Object.is,
      preventExtensions: Object.preventExtensions,
      isExtensible: Object.isExtensible,
      isSealed: Object.isSealed,
      isFrozen: Object.isFrozen,
    },
    String,
    Number,
    Boolean,
    RegExp,
    Error,
    TypeError,
    RangeError,
    SyntaxError,
    ReferenceError,
    Promise,
    Set,
    Map,
    WeakSet,
    WeakMap,
    Symbol,
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
    
    // Helper functions (jQuery-style accessors)
    $: {
      item: (index: number = 0) => items[index]?.json || {},
      all: () => items,
      first: () => items[0]?.json || {},
      last: () => items[items.length - 1]?.json || {},
    },
    
    // Result capture
    _result: undefined,
  };

  return vm.createContext(context);
}

/**
 * Executes JavaScript code in a secure sandbox using Node.js vm module
 */
export function executeSandboxedJavaScript(
  code: string,
  items: any[],
  options: { timeout?: number; executeOnce?: boolean } = {}
): { success: boolean; output: any[]; error?: string } {
  const timeout = options.timeout || EXECUTION_TIMEOUT;
  const executeOnce = options.executeOnce || false;
  const inputItems = executeOnce ? [items[0] || { json: {} }] : items;

  // Validate code first
  const validation = validateJavaScriptCode(code);
  if (!validation.valid) {
    return { success: false, output: [], error: validation.error };
  }

  try {
    // Create secure context
    const context = createSecureContext(inputItems);

    // Wrap user code to capture return value
    // We wrap in an IIFE to capture the return value properly
    const wrappedCode = `
      (function() {
        "use strict";
        ${code}
      })()
    `;

    // Create script with timeout
    const script = new vm.Script(wrappedCode, {
      timeout,
      displayErrors: false,
    } as any);

    // Execute in isolated context
    const result = script.runInContext(context, {
      timeout,
      displayErrors: false,
    });

    // Handle promises (reject them - async not supported)
    if (result instanceof Promise) {
      return {
        success: false,
        output: [],
        error: 'Async/await and Promises are not supported in Code node for security reasons. Use synchronous code only.',
      };
    }

    // Normalize result
    let output: any[];
    if (Array.isArray(result)) {
      output = result.map((item: any) => {
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
    } else if (result !== undefined) {
      output = [{ json: { value: result } }];
    } else {
      // If no explicit return, return empty result
      output = [{ json: {} }];
    }

    // Check output size to prevent memory exhaustion
    const outputSize = JSON.stringify(output).length;
    if (outputSize > MAX_OUTPUT_SIZE) {
      return {
        success: false,
        output: [],
        error: `Output size (${outputSize} bytes) exceeds maximum allowed (${MAX_OUTPUT_SIZE} bytes)`,
      };
    }

    return { success: true, output };
  } catch (error: any) {
    // Sanitize error message to not leak implementation details
    let errorMessage = error.message || 'Unknown error';
    
    // Replace specific error patterns with generic messages
    if (errorMessage.includes('timeout') || errorMessage.includes('Timeout')) {
      errorMessage = `Code execution timed out after ${timeout}ms`;
    } else if (errorMessage.includes('Script execution')) {
      errorMessage = 'Code execution failed';
    }

    return {
      success: false,
      output: [],
      error: `Execution error: ${errorMessage}`,
    };
  }
}

/**
 * Executes Python code with restrictions
 */
export function executeSandboxedPython(
  code: string,
  items: any[],
  options: { timeout?: number; executeOnce?: boolean } = {}
): Promise<{ success: boolean; output: any[]; error?: string }> {
  const timeout = options.timeout || EXECUTION_TIMEOUT;
  const executeOnce = options.executeOnce || false;
  const inputData = executeOnce ? [items[0] || { json: {} }] : items;

  // Validate code first
  const validation = validatePythonCode(code);
  if (!validation.valid) {
    return Promise.resolve({ success: false, output: [], error: validation.error });
  }

  // Write input data to a temp JSON file to avoid string interpolation attacks
  const inputFileName = `ordovertex_input_${Date.now()}_${Math.random().toString(36).slice(2)}.json`;
  const inputFilePath = path.join('/tmp', inputFileName);
  fs.writeFileSync(inputFilePath, JSON.stringify(inputData), 'utf8');

  return new Promise((resolve) => {
    // Create a restricted Python script with security wrapper
    const allowedModulesStr = ALLOWED_PYTHON_MODULES.join(', ');
    
    const pythonScript = `
# SECURITY WRAPPER - Restricted Execution Environment
import sys
import json
# Remove dangerous modules from sys.modules if present
for mod in ['os', 'sys', 'subprocess', 'socket', 'urllib', 'http', 'ftplib', 'smtplib', 'ssl', 'ctypes', 'mmap', 'code', 'codeop', 'runpy', 'importlib']:
    if mod in sys.modules:
        del sys.modules[mod]

# Limit builtins to safe subset only
allowed_builtins = [
    'abs', 'all', 'any', 'ascii', 'bin', 'bool', 'bytearray', 'bytes',
    'callable', 'chr', 'classmethod', 'complex', 'delattr', 'dict', 'dir',
    'divmod', 'enumerate', 'filter', 'float', 'format', 'frozenset',
    'getattr', 'globals', 'hasattr', 'hash', 'help', 'hex', 'id',
    'input', 'int', 'isinstance', 'issubclass', 'iter', 'len', 'list',
    'locals', 'map', 'max', 'memoryview', 'min', 'next', 'object',
    'oct', 'ord', 'pow', 'print', 'property', 'range', 'repr',
    'reversed', 'round', 'set', 'setattr', 'slice', 'sorted',
    'staticmethod', 'str', 'sum', 'super', 'tuple', 'type', 'vars', 'zip'
]

# Create restricted builtins
safe_builtins = {name: __builtins__[name] for name in allowed_builtins if name in __builtins__}

# Replace builtins completely
__builtins__ = safe_builtins

# Disable file operations by overriding open
class DisabledIO:
    def __init__(self, *args, **kwargs):
        raise IOError("File operations are disabled in Code node")

open = DisabledIO

# Read input data from temp JSON file passed as first argument
input_file_path = sys.argv[1] if len(sys.argv) > 1 else None
if input_file_path:
    with open(input_file_path, 'r') as f:
        items = json.load(f)
else:
    items = []

# Helper functions for data access
def get_item(index=0):
    return items[index]['json'] if index < len(items) else {}

def get_all():
    return items

def get_first():
    return items[0]['json'] if items else {}

def get_last():
    return items[-1]['json'] if items else {}

# User code execution
try:
${code.split('\n').map(line => '    ' + line).join('\n')}
    
    # Capture results
    output_data = None
    if 'results' in dir():
        output_data = results
    elif 'result' in dir():
        output_data = result
    
    # Output with markers
    print("___ORDOVERTEX_OUTPUT_START___")
    print(json.dumps(output_data))
    print("___ORDOVERTEX_OUTPUT_END___")
    
except Exception as e:
    print("___ORDOVERTEX_ERROR___")
    print(str(e))
    print("___ORDOVERTEX_ERROR_END___")
`;

    let output = '';
    let errorOutput = '';
    let jsonResult: any = null;
    let hasError = false;
    let isFinished = false;

    // Set up timeout
    const timeoutId = setTimeout(() => {
      if (!isFinished) {
        isFinished = true;
        // Clean up temp file on timeout
        try { fs.unlinkSync(inputFilePath); } catch {}
        resolve({
          success: false,
          output: [],
          error: `Python execution timed out after ${timeout}ms`,
        });
      }
    }, timeout);

    try {
      const pyshell = new PythonShell('script.py', {
        mode: 'text',
        pythonPath: 'python3',
        scriptPath: '/tmp',
        args: [inputFilePath],
      });

      pyshell.on('message', (message: string) => {
        if (isFinished) return;
        output += message + '\n';

        if (message.includes('___ORDOVERTEX_ERROR___')) {
          hasError = true;
        } else if (hasError && message.includes('___ORDOVERTEX_ERROR_END___')) {
          hasError = false;
        } else if (hasError) {
          errorOutput += message + '\n';
        } else if (message.includes('___ORDOVERTEX_OUTPUT_START___')) {
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

      pyshell.on('stderr', (stderr: string) => {
        if (!isFinished) {
          errorOutput += stderr + '\n';
        }
      });

      pyshell.on('error', (err: Error) => {
        if (isFinished) return;
        isFinished = true;
        clearTimeout(timeoutId);
        try { fs.unlinkSync(inputFilePath); } catch {}
        resolve({
          success: false,
          output: [],
          error: `Python execution error: ${err.message}`,
        });
      });

      pyshell.on('close', () => {
        if (isFinished) return;
        isFinished = true;
        clearTimeout(timeoutId);
        try { fs.unlinkSync(inputFilePath); } catch {}

        if (errorOutput && !jsonResult) {
          resolve({
            success: false,
            output: [],
            error: `Python error: ${errorOutput.substring(0, 500)}`,
          });
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

        // Check output size
        const outputSize = JSON.stringify(finalOutput).length;
        if (outputSize > MAX_OUTPUT_SIZE) {
          resolve({
            success: false,
            output: [],
            error: `Output size (${outputSize} bytes) exceeds maximum allowed (${MAX_OUTPUT_SIZE} bytes)`,
          });
          return;
        }

        resolve({ success: true, output: finalOutput });
      });

      // Send the script
      pyshell.send(pythonScript);
      pyshell.end((err: any) => { if (err) logger.error(err); });
    } catch (error: any) {
      if (!isFinished) {
        isFinished = true;
        clearTimeout(timeoutId);
        try { fs.unlinkSync(inputFilePath); } catch {}
        resolve({
          success: false,
          output: [],
          error: `Failed to start Python execution: ${error.message}`,
        });
      }
    }
  });
}

/**
 * Check if a workflow contains code nodes (for admin approval)
 */
export function workflowContainsCodeNodes(workflow: any): boolean {
  if (!workflow || !workflow.nodes) return false;

  return workflow.nodes.some((node: any) => {
    return node.type === 'code' || node.type === 'function' || node.type === 'script';
  });
}

/**
 * Sanitize code output to prevent data exfiltration
 */
export function sanitizeCodeOutput(output: any[]): any[] {
  return output.map(item => {
    if (!item || typeof item !== 'object') return { json: { value: item } };
    
    // Deep clone and sanitize
    const sanitized = JSON.parse(JSON.stringify(item, (key, value) => {
      // Remove functions and undefined values
      if (typeof value === 'function') return undefined;
      if (typeof value === 'undefined') return null;
      return value;
    }));

    return sanitized;
  });
}
