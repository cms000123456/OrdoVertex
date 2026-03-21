# Node Development Guide

This guide explains how to create custom nodes for OrdoVertex. Nodes are the building blocks of workflows - they can be triggers (start workflows) or actions (process data).

## Table of Contents

1. [Node Basics](#node-basics)
2. [Creating Your First Node](#creating-your-first-node)
3. [Node Structure](#node-structure)
4. [Properties & UI](#properties--ui)
5. [Execution Context](#execution-context)
6. [Error Handling](#error-handling)
7. [Advanced Topics](#advanced-topics)
8. [Examples](#examples)

---

## Node Basics

### What is a Node?

A node is a self-contained unit that:
- **Receives** input data from previous nodes
- **Processes** that data (transforms, API calls, calculations)
- **Returns** output data to the next node

### Types of Nodes

| Type | Purpose | Example |
|------|---------|---------|
| **Trigger** | Start workflows | Webhook, Schedule, File Watch |
| **Action** | Process data | HTTP Request, Code, Database |
| **Transform** | Manipulate data | Filter, Sort, Map Fields |

---

## Creating Your First Node

Let's create a simple "Hello World" node that greets a person by name.

### Step 1: Create the Node File

Create `backend/src/nodes/actions/hello-world.ts`:

```typescript
import { NodeType } from '../../types';

export const helloWorldNode: NodeType = {
  // Unique identifier (no spaces, camelCase)
  name: 'helloWorld',
  
  // Display name in the UI
  displayName: 'Hello World',
  
  // Description shown in node picker
  description: 'Greets a person by name',
  
  // Font Awesome icon (fa:icon-name)
  icon: 'fa:hand-wave',
  
  // Category in node picker
  category: 'Actions',
  
  // Version for migrations
  version: 1,
  
  // Input connections from previous nodes
  inputs: [
    {
      name: 'input',
      type: 'all',
      description: 'Input data (can contain a name field)'
    }
  ],
  
  // Output connections to next nodes
  outputs: [
    {
      name: 'output',
      type: 'all',
      description: 'Greeting message'
    }
  ],
  
  // Configuration properties shown in UI
  properties: [
    {
      name: 'greetingStyle',
      displayName: 'Greeting Style',
      type: 'options',
      options: [
        { name: 'Formal', value: 'formal' },
        { name: 'Casual', value: 'casual' },
        { name: 'Excited', value: 'excited' }
      ],
      default: 'casual',
      description: 'How to greet the person'
    },
    {
      name: 'name',
      displayName: 'Name',
      type: 'string',
      required: true,
      placeholder: 'Enter name or use {{input.name}}',
      description: 'Name of the person to greet'
    }
  ],
  
  // The actual execution logic
  execute: async (context) => {
    const { greetingStyle, name } = context.parameters;
    
    // Build greeting based on style
    let greeting: string;
    switch (greetingStyle) {
      case 'formal':
        greeting = `Good day, ${name}.`;
        break;
      case 'excited':
        greeting = `Hey ${name}!!! 🎉`;
        break;
      case 'casual':
      default:
        greeting = `Hi ${name}!`;
    }
    
    return {
      success: true,
      output: {
        greeting,
        name,
        timestamp: new Date().toISOString()
      }
    };
  }
};
```

### Step 2: Register the Node

Edit `backend/src/nodes/index.ts`:

```typescript
// Add import at the top
import { helloWorldNode } from './actions/hello-world';

// Add to registerAllNodes function
export function registerAllNodes() {
  // ... existing nodes
  nodeRegistry.register(helloWorldNode);
}
```

### Step 3: Test Your Node

1. Restart the backend server:
   ```bash
   cd backend && npm run dev
   ```

2. Open the frontend at `http://localhost:3000`

3. Create a new workflow

4. Find your "Hello World" node in the Actions category

5. Configure and run it!

---

## Node Structure

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Unique identifier (camelCase, no spaces) |
| `displayName` | `string` | Human-readable name |
| `description` | `string` | Shown in node picker |
| `category` | `string` | Group in node picker |
| `version` | `number` | For migrations |
| `inputs` | `NodeInput[]` | Input connection points |
| `outputs` | `NodeOutput[]` | Output connection points |
| `properties` | `NodeProperty[]` | Configuration UI |
| `execute` | `function` | Your logic |

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `icon` | `string` | Font Awesome icon (fa:name) |
| `credentials` | `NodeCredential[]` | Required credentials |
| `trigger` | `boolean` | Is a trigger node |

---

## Properties & UI

Property types control what UI element is shown:

### String
```typescript
{
  name: 'apiUrl',
  displayName: 'API URL',
  type: 'string',
  required: true,
  placeholder: 'https://api.example.com',
  description: 'The API endpoint'
}
```

### Number
```typescript
{
  name: 'timeout',
  displayName: 'Timeout (ms)',
  type: 'number',
  default: 5000,
  description: 'Request timeout in milliseconds'
}
```

### Boolean
```typescript
{
  name: 'enableRetry',
  displayName: 'Enable Retry',
  type: 'boolean',
  default: false,
  description: 'Retry on failure'
}
```

### Options (Dropdown)
```typescript
{
  name: 'method',
  displayName: 'HTTP Method',
  type: 'options',
  options: [
    { name: 'GET', value: 'GET' },
    { name: 'POST', value: 'POST' },
    { name: 'PUT', value: 'PUT' }
  ],
  default: 'GET'
}
```

### Multiline (Text Area)
```typescript
{
  name: 'jsonBody',
  displayName: 'JSON Body',
  type: 'multiline',
  placeholder: '{\n  "key": "value"\n}',
  description: 'Request body as JSON'
}
```

### JSON
```typescript
{
  name: 'headers',
  displayName: 'Headers',
  type: 'json',
  default: {},
  description: 'HTTP headers as JSON object'
}
```

### Conditional Display

Show/hide properties based on other values:

```typescript
{
  name: 'apiKey',
  displayName: 'API Key',
  type: 'string',
  required: true,
  displayOptions: {
    show: {
      authentication: ['apiKey']  // Only show when auth type is 'apiKey'
    }
  }
}
```

---

## Execution Context

The `execute` function receives a context object:

```typescript
interface NodeExecuteContext {
  // Node configuration values
  parameters: { [key: string]: any };
  
  // Data from previous node
  inputData: any;
  
  // Execution metadata
  executionId: string;
  
  // Current workflow
  workflowId: string;
  
  // Node instance ID
  nodeId: string;
  
  // Credential helper (if credentials defined)
  getCredentials?: (type: string) => Promise<any>;
}
```

### Accessing Input Data

```typescript
execute: async (context) => {
  const { inputData, parameters } = context;
  
  // Data from previous node
  const userEmail = inputData?.email;
  const previousResult = inputData;
  
  // User-configured parameters
  const { greeting, name } = parameters;
  
  // ... your logic
}
```

### Expression Evaluation

Support expressions like `{{input.name}}`:

```typescript
import { evaluateExpression } from '../../utils/expressions';

execute: async (context) => {
  const { parameters, inputData } = context;
  
  // Evaluate expressions in parameters
  const name = evaluateExpression(parameters.name, inputData);
  
  return {
    success: true,
    output: { greeting: `Hello ${name}` }
  };
}
```

---

## Error Handling

### Basic Error Handling

```typescript
execute: async (context) => {
  try {
    const result = await someAsyncOperation();
    
    return {
      success: true,
      output: result
    };
  } catch (error) {
    return {
      success: false,
      error: {
        message: error.message,
        code: 'OPERATION_FAILED'
      }
    };
  }
}
```

### Validation

```typescript
execute: async (context) => {
  const { url } = context.parameters;
  
  // Validate required parameters
  if (!url) {
    return {
      success: false,
      error: {
        message: 'URL is required',
        code: 'VALIDATION_ERROR'
      }
    };
  }
  
  // Validate URL format
  try {
    new URL(url);
  } catch {
    return {
      success: false,
      error: {
        message: 'Invalid URL format',
        code: 'VALIDATION_ERROR'
      }
    };
  }
  
  // ... continue execution
}
```

### Multiple Output Branches

Handle success/failure paths:

```typescript
outputs: [
  { name: 'success', type: 'all', description: 'Operation succeeded' },
  { name: 'error', type: 'all', description: 'Operation failed' }
]

execute: async (context) => {
  try {
    const result = await riskyOperation();
    
    return {
      success: true,
      output: result,
      outputBranch: 'success'  // Connects to 'success' output
    };
  } catch (error) {
    return {
      success: true,  // Still success, but on error branch
      output: { error: error.message },
      outputBranch: 'error'
    };
  }
}
```

---

## Advanced Topics

### Using Credentials

```typescript
export const apiNode: NodeType = {
  name: 'apiCall',
  displayName: 'API Call',
  // ... other fields
  
  credentials: [
    {
      name: 'apiKey',
      required: true,
      description: 'API key for authentication'
    }
  ],
  
  execute: async (context) => {
    // Get credential
    const apiKey = await context.getCredentials?.('apiKey');
    
    if (!apiKey) {
      return {
        success: false,
        error: { message: 'API key credential not found' }
      };
    }
    
    // Use in request
    const response = await fetch('https://api.example.com', {
      headers: { 'Authorization': `Bearer ${apiKey.key}` }
    });
    
    // ...
  }
};
```

### Database Access

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const dbNode: NodeType = {
  name: 'saveToDb',
  displayName: 'Save to Database',
  // ...
  
  execute: async (context) => {
    const { table, data } = context.parameters;
    
    try {
      // Save to database
      const record = await prisma[table].create({ data });
      
      return {
        success: true,
        output: { id: record.id }
      };
    } catch (error) {
      return {
        success: false,
        error: { message: error.message }
      };
    }
  }
};
```

### Trigger Nodes

Trigger nodes start workflows automatically:

```typescript
export const customTriggerNode: NodeType = {
  name: 'customTrigger',
  displayName: 'Custom Trigger',
  category: 'Triggers',
  trigger: true,  // Mark as trigger
  // ...
  
  // Triggers don't need execute, they emit events
  // See schedule trigger for polling example
};
```

### Batch Processing

Process arrays of items:

```typescript
execute: async (context) => {
  const { items } = context.inputData;
  
  if (!Array.isArray(items)) {
    return {
      success: false,
      error: { message: 'Input must be an array' }
    };
  }
  
  const results = [];
  for (const item of items) {
    const result = await processItem(item);
    results.push(result);
  }
  
  return {
    success: true,
    output: {
      processed: results.length,
      results
    }
  };
}
```

---

## Examples

### Example 1: Slack Notification Node

```typescript
import { NodeType } from '../../types';

export const slackNode: NodeType = {
  name: 'slackNotify',
  displayName: 'Send Slack Message',
  description: 'Send a message to a Slack channel',
  icon: 'fa:hashtag',
  category: 'Actions',
  version: 1,
  
  inputs: [{ name: 'input', type: 'all', description: 'Input data' }],
  outputs: [{ name: 'output', type: 'all', description: 'Slack API response' }],
  
  properties: [
    {
      name: 'webhookUrl',
      displayName: 'Webhook URL',
      type: 'string',
      required: true,
      placeholder: 'https://hooks.slack.com/services/...'
    },
    {
      name: 'message',
      displayName: 'Message',
      type: 'multiline',
      required: true,
      placeholder: 'Hello from OrdoVertex!'
    },
    {
      name: 'username',
      displayName: 'Bot Username',
      type: 'string',
      placeholder: 'OrdoVertex Bot'
    }
  ],
  
  execute: async (context) => {
    const { webhookUrl, message, username } = context.parameters;
    
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: message,
          username: username || 'OrdoVertex'
        })
      });
      
      if (!response.ok) {
        throw new Error(`Slack API error: ${response.status}`);
      }
      
      return {
        success: true,
        output: { sent: true, timestamp: new Date().toISOString() }
      };
    } catch (error) {
      return {
        success: false,
        error: { message: error.message }
      };
    }
  }
};
```

### Example 2: Data Validator Node

```typescript
import { NodeType } from '../../types';

export const validateNode: NodeType = {
  name: 'validateData',
  displayName: 'Validate Data',
  description: 'Validate data against rules',
  icon: 'fa:check-circle',
  category: 'Transform',
  version: 1,
  
  inputs: [{ name: 'input', type: 'all', description: 'Data to validate' }],
  outputs: [
    { name: 'valid', type: 'all', description: 'Data is valid' },
    { name: 'invalid', type: 'all', description: 'Data is invalid' }
  ],
  
  properties: [
    {
      name: 'rules',
      displayName: 'Validation Rules',
      type: 'json',
      default: {
        required: [],
        types: {}
      },
      description: 'JSON object with validation rules'
    }
  ],
  
  execute: async (context) => {
    const { inputData } = context;
    const { rules } = context.parameters;
    
    const errors = [];
    
    // Check required fields
    for (const field of rules.required || []) {
      if (!inputData[field]) {
        errors.push(`Missing required field: ${field}`);
      }
    }
    
    // Check types
    for (const [field, type] of Object.entries(rules.types || {})) {
      if (inputData[field] && typeof inputData[field] !== type) {
        errors.push(`Field ${field} should be ${type}`);
      }
    }
    
    if (errors.length > 0) {
      return {
        success: true,
        output: { errors, valid: false },
        outputBranch: 'invalid'
      };
    }
    
    return {
      success: true,
      output: { data: inputData, valid: true },
      outputBranch: 'valid'
    };
  }
};
```

### Example 3: Calculator Node

```typescript
import { NodeType } from '../../types';

export const calculatorNode: NodeType = {
  name: 'calculator',
  displayName: 'Calculator',
  description: 'Perform mathematical operations',
  icon: 'fa:calculator',
  category: 'Transform',
  version: 1,
  
  inputs: [{ name: 'input', type: 'all', description: 'Input values' }],
  outputs: [{ name: 'output', type: 'number', description: 'Calculation result' }],
  
  properties: [
    {
      name: 'operation',
      displayName: 'Operation',
      type: 'options',
      options: [
        { name: 'Add (+)', value: 'add' },
        { name: 'Subtract (-)', value: 'subtract' },
        { name: 'Multiply (×)', value: 'multiply' },
        { name: 'Divide (÷)', value: 'divide' }
      ],
      default: 'add'
    },
    {
      name: 'value1',
      displayName: 'Value 1',
      type: 'number',
      required: true
    },
    {
      name: 'value2',
      displayName: 'Value 2',
      type: 'number',
      required: true
    }
  ],
  
  execute: async (context) => {
    const { operation, value1, value2 } = context.parameters;
    
    let result: number;
    
    switch (operation) {
      case 'add':
        result = value1 + value2;
        break;
      case 'subtract':
        result = value1 - value2;
        break;
      case 'multiply':
        result = value1 * value2;
        break;
      case 'divide':
        if (value2 === 0) {
          return {
            success: false,
            error: { message: 'Cannot divide by zero' }
          };
        }
        result = value1 / value2;
        break;
      default:
        return {
          success: false,
          error: { message: 'Unknown operation' }
        };
    }
    
    return {
      success: true,
      output: {
        result,
        operation,
        expression: `${value1} ${operation} ${value2} = ${result}`
      }
    };
  }
};
```

---

## Testing Your Node

### Manual Testing

1. **Start the server:**
   ```bash
   cd backend && npm run dev
   ```

2. **Open frontend:** http://localhost:3000

3. **Create workflow:** Drag your node, configure, execute

### Unit Testing

Create `backend/src/nodes/actions/__tests__/hello-world.test.ts`:

```typescript
import { helloWorldNode } from '../hello-world';

describe('Hello World Node', () => {
  it('should create casual greeting', async () => {
    const result = await helloWorldNode.execute({
      parameters: { greetingStyle: 'casual', name: 'Alice' },
      inputData: {},
      executionId: 'test-1',
      workflowId: 'wf-1',
      nodeId: 'node-1'
    });
    
    expect(result.success).toBe(true);
    expect(result.output.greeting).toBe('Hi Alice!');
  });
  
  it('should create formal greeting', async () => {
    const result = await helloWorldNode.execute({
      parameters: { greetingStyle: 'formal', name: 'Bob' },
      inputData: {},
      executionId: 'test-2',
      workflowId: 'wf-1',
      nodeId: 'node-2'
    });
    
    expect(result.success).toBe(true);
    expect(result.output.greeting).toBe('Good day, Bob.');
  });
});
```

---

## Best Practices

1. **Always validate inputs** - Check required parameters
2. **Return clear errors** - Include helpful error messages
3. **Use TypeScript** - Leverage type safety
4. **Handle edge cases** - Empty inputs, network failures, etc.
5. **Document your node** - Clear descriptions help users
6. **Test thoroughly** - Unit tests catch bugs early
7. **Follow naming conventions** - camelCase for node names
8. **Version your nodes** - Increment version on breaking changes

---

## Troubleshooting

### Node Not Appearing

- Check import in `nodes/index.ts`
- Verify `registerAllNodes()` is called
- Check server logs for errors

### Execution Fails

- Check browser console for errors
- Verify input data format
- Test with simple inputs first

### Type Errors

- Ensure all required NodeType fields are present
- Check TypeScript types match your data

---

## Need Help?

- Check existing nodes in `backend/src/nodes/actions/` for examples
- Review the `NodeType` interface in `backend/src/types/index.ts`
- Look at the [API Documentation](API.md) for runtime context

Happy node building! 🚀
