import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../utils/auth';
import { aiAgentTemplates } from '../utils/ai-templates';
import crypto from 'crypto';

const router = Router();
const prisma = new PrismaClient();

// All available templates
const workflowTemplates = {
  // Tutorial Template
  'tutorial-data-flow': {
    name: '📚 Tutorial: Data Flow Demo',
    description: 'Learn how data flows between nodes. Click Execute and inspect each node to see Input/Output data!',
    category: 'Tutorial',
    tags: ['tutorial', 'learning', 'example'],
    nodes: [
      {
        id: 'trigger-1',
        type: 'manualTrigger',
        name: 'Manual Trigger',
        description: 'Click Execute to start the workflow',
        position: { x: 100, y: 200 },
        parameters: {}
      },
      {
        id: 'code-1',
        type: 'code',
        name: 'Generate Sample Data',
        description: 'Creates sample user data to demonstrate data flow',
        position: { x: 400, y: 200 },
        parameters: {
          code: `const users = [
  { id: 1, name: 'Alice', role: 'admin', department: 'Engineering' },
  { id: 2, name: 'Bob', role: 'user', department: 'Marketing' },
  { id: 3, name: 'Carol', role: 'user', department: 'Engineering' }
];
return [{ json: {
  generatedAt: new Date().toISOString(),
  count: users.length,
  users: users,
  source: 'tutorial-workflow'
} }];`
        }
      },
      {
        id: 'code-2',
        type: 'code',
        name: 'Transform Data',
        description: 'Filters Engineering users and adds computed fields',
        position: { x: 700, y: 200 },
        parameters: {
          code: `// 'items' is already provided as input data
const data = items[0]?.json || {};
const engineeringUsers = (data.users || []).filter(u => u.department === 'Engineering');
const transformed = engineeringUsers.map(user => ({
  ...user,
  email: user.name.toLowerCase() + '@company.com',
  accessLevel: user.role === 'admin' ? 'full' : 'limited'
}));
return [{ json: {
  originalCount: data.count,
  filteredCount: transformed.length,
  department: 'Engineering',
  users: transformed
} }];`
        }
      },
      {
        id: 'set-1',
        type: 'set',
        name: 'Final Result',
        description: 'Formats the final output',
        position: { x: 1000, y: 200 },
        parameters: {
          mode: 'manual',
          values: [
            { name: 'summary', value: 'Tutorial workflow completed successfully' },
            { name: 'timestamp', value: '{{ $now }}' }
          ]
        }
      }
    ],
    connections: [
      { source: 'trigger-1', sourceHandle: 'default', target: 'code-1', targetHandle: 'input' },
      { source: 'code-1', sourceHandle: 'default', target: 'code-2', targetHandle: 'input' },
      { source: 'code-2', sourceHandle: 'default', target: 'set-1', targetHandle: 'input' }
    ]
  },

  // Demo Templates
  'demo-weather-api': {
    name: '🌤️ Demo: Weather API',
    description: 'Fetch weather data from free API (no key needed)',
    category: 'Demo',
    tags: ['demo', 'weather', 'api'],
    nodes: [
      {
        id: 'trigger-1',
        type: 'manualTrigger',
        name: 'Manual Trigger',
        position: { x: 100, y: 200 },
        parameters: {}
      },
      {
        id: 'set-1',
        type: 'set',
        name: 'Set Location',
        position: { x: 350, y: 200 },
        parameters: {
          mode: 'manual',
          values: [
            { name: 'city', value: 'London' }
          ]
        }
      },
      {
        id: 'http-1',
        type: 'httpRequest',
        name: 'Fetch Weather',
        position: { x: 600, y: 200 },
        parameters: {
          method: 'GET',
          url: 'https://wttr.in/{{ $json.city }}?format=j1'
        }
      },
      {
        id: 'code-1',
        type: 'code',
        name: 'Transform Data',
        position: { x: 900, y: 200 },
        parameters: {
          code: 'const data = items[0]?.json || {};\n// wttr.in returns { current_condition: [{ temp_C, humidity, weatherDesc }] }\nconst current = data.current_condition?.[0] || {};\nreturn [{ json: {\n  location: data.request?.[0]?.query || "London",\n  temp: current.temp_C + "C" || "N/A",\n  condition: current.weatherDesc?.[0]?.value || "N/A",\n  humidity: current.humidity + "%" || "N/A",\n  raw: JSON.stringify(data).slice(0, 500)\n} }];'
        }
      }
    ],
    connections: [
      { source: 'trigger-1', target: 'set-1' },
      { source: 'set-1', target: 'http-1' },
      { source: 'http-1', target: 'code-1' }
    ]
  },

  'demo-crypto-prices': {
    name: '💰 Demo: Crypto Prices',
    description: 'Fetch crypto prices from CoinGecko (free, no key)',
    category: 'Demo',
    tags: ['demo', 'crypto', 'finance'],
    nodes: [
      {
        id: 'trigger-1',
        type: 'manualTrigger',
        name: 'Manual Trigger',
        position: { x: 100, y: 200 },
        parameters: {}
      },
      {
        id: 'http-1',
        type: 'httpRequest',
        name: 'Fetch Prices',
        position: { x: 400, y: 200 },
        parameters: {
          method: 'GET',
          url: 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd'
        }
      },
      {
        id: 'code-1',
        type: 'code',
        name: 'Format Prices',
        position: { x: 700, y: 200 },
        parameters: {
          code: 'const prices = items[0]?.json || {};\nreturn [{ json: {\n  bitcoin: "$" + prices.bitcoin?.usd || "N/A",\n  ethereum: "$" + prices.ethereum?.usd || "N/A",\n  timestamp: new Date().toISOString()\n} }];'
        }
      }
    ],
    connections: [
      { source: 'trigger-1', target: 'http-1' },
      { source: 'http-1', target: 'code-1' }
    ]
  },

  // AI Templates
  ...Object.entries(aiAgentTemplates).reduce((acc, [key, value]) => ({
    ...acc,
    [`ai-${key}`]: {
      ...value,
      category: 'AI',
      tags: ['ai', 'agent', 'openai']
    }
  }), {}),

  // Data Processing Templates
  'data-csv-processor': {
    name: 'CSV Processor',
    description: 'Parse CSV files and process data',
    category: 'Data',
    tags: ['csv', 'data', 'transform'],
    nodes: [
      {
        id: 'trigger-1',
        type: 'fileWatch',
        name: 'File Watch',
        position: { x: 100, y: 200 },
        parameters: {
          folderPath: '/data/incoming',
          pattern: '*.csv',
          readContent: true,
          encoding: 'utf8'
        }
      },
      {
        id: 'csv-1',
        type: 'csv',
        name: 'Parse CSV',
        position: { x: 400, y: 200 },
        parameters: {
          operation: 'parse',
          inputField: 'content',
          delimiter: ',',
          header: true
        }
      },
      {
        id: 'filter-1',
        type: 'filter',
        name: 'Filter Valid Rows',
        position: { x: 700, y: 200 },
        parameters: {
          mode: 'simple',
          field: 'status',
          operator: 'eq',
          value: 'active'
        }
      }
    ],
    connections: [
      { id: 'conn-1', source: 'trigger-1', target: 'csv-1' },
      { id: 'conn-2', source: 'csv-1', target: 'filter-1' }
    ]
  },

  // Integration Templates
  'integration-webhook-api': {
    name: 'Webhook to API',
    description: 'Receive webhook and forward to external API',
    category: 'Integration',
    tags: ['webhook', 'api', 'http'],
    nodes: [
      {
        id: 'trigger-1',
        type: 'webhook',
        name: 'Webhook Trigger',
        position: { x: 100, y: 200 },
        parameters: {
          path: 'incoming-data',
          method: 'POST',
          responseMode: 'responseNode'
        }
      },
      {
        id: 'transform-1',
        type: 'set',
        name: 'Transform Data',
        position: { x: 400, y: 200 },
        parameters: {
          values: [
            { name: 'processedData', value: '{{ JSON.stringify($input) }}' }
          ]
        }
      },
      {
        id: 'http-1',
        type: 'httpRequest',
        name: 'Send to API',
        position: { x: 700, y: 200 },
        parameters: {
          method: 'POST',
          url: 'https://api.example.com/webhook',
          headers: {
            'Content-Type': 'application/json'
          },
          body: '{{ $json.processedData }}'
        }
      },
      {
        id: 'response-1',
        type: 'webhookResponse',
        name: 'Response',
        position: { x: 700, y: 400 },
        parameters: {
          statusCode: 200,
          contentType: 'application/json',
          responseMode: 'json',
          jsonData: { success: true, message: 'Received' }
        }
      }
    ],
    connections: [
      { id: 'conn-1', source: 'trigger-1', target: 'transform-1' },
      { id: 'conn-2', source: 'transform-1', target: 'http-1' },
      { id: 'conn-3', source: 'http-1', target: 'response-1' }
    ]
  },

  // Database Templates
  'db-sync-data': {
    name: 'Database Sync',
    description: 'Synchronize data between databases',
    category: 'Database',
    tags: ['database', 'sql', 'sync'],
    nodes: [
      {
        id: 'trigger-1',
        type: 'scheduleTrigger',
        name: 'Schedule',
        position: { x: 100, y: 200 },
        parameters: {
          rule: '0 */6 * * *',
          timezone: 'UTC'
        }
      },
      {
        id: 'sql-source',
        type: 'sqlDatabase',
        name: 'Read Source DB',
        position: { x: 400, y: 200 },
        parameters: {
          operation: 'select',
          query: 'SELECT * FROM sync_table WHERE updated_at > NOW() - INTERVAL \'6 hours\''
        }
      },
      {
        id: 'transform-1',
        type: 'code',
        name: 'Transform',
        position: { x: 700, y: 200 },
        parameters: {
          code: '// Transform data for target\nconst rows = $input.all();\nreturn rows.map(r => ({\n  json: {\n    ...r.json,\n    synced_at: new Date().toISOString()\n  }\n}));'
        }
      },
      {
        id: 'sql-target',
        type: 'sqlDatabase',
        name: 'Write Target DB',
        position: { x: 1000, y: 200 },
        parameters: {
          operation: 'insert',
          query: 'INSERT INTO sync_table (id, data, updated_at) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET data = $2, updated_at = $3'
        }
      }
    ],
    connections: [
      { id: 'conn-1', source: 'trigger-1', target: 'sql-source' },
      { id: 'conn-2', source: 'sql-source', target: 'transform-1' },
      { id: 'conn-3', source: 'transform-1', target: 'sql-target' }
    ]
  },

  // Notification Templates
  'notify-error-alert': {
    name: 'Error Alert System',
    description: 'Send alerts when errors occur',
    category: 'Notification',
    tags: ['email', 'alert', 'notification'],
    nodes: [
      {
        id: 'trigger-1',
        type: 'webhook',
        name: 'Error Webhook',
        position: { x: 100, y: 200 },
        parameters: {
          path: 'error-report',
          method: 'POST'
        }
      },
      {
        id: 'format-1',
        type: 'code',
        name: 'Format Alert',
        position: { x: 400, y: 200 },
        parameters: {
          code: `const error = $input.first().json;
return {
  json: {
    subject: \`Error: \${error.service}\`,
    body: \`
Service: \${error.service}
Time: \${error.timestamp}
Error: \${error.message}
Stack: \${error.stack}
    \`.trim()
  }
};`
        }
      },
      {
        id: 'email-1',
        type: 'sendEmail',
        name: 'Send Alert Email',
        position: { x: 700, y: 200 },
        parameters: {
          from: 'alerts@company.com',
          to: 'admin@company.com',
          subject: '{{ $json.subject }}',
          body: '{{ $json.body }}',
          bodyType: 'text'
        }
      }
    ],
    connections: [
      { id: 'conn-1', source: 'trigger-1', target: 'format-1' },
      { id: 'conn-2', source: 'format-1', target: 'email-1' }
    ]
  },

  // File Processing
  'file-sftp-sync': {
    name: 'SFTP File Sync',
    description: 'Download files from SFTP and process them',
    category: 'File',
    tags: ['sftp', 'file', 'sync'],
    nodes: [
      {
        id: 'trigger-1',
        type: 'sftpTrigger',
        name: 'SFTP Watch',
        position: { x: 100, y: 200 },
        parameters: {
          remotePath: '/uploads',
          pattern: '*.xml',
          downloadContent: true,
          encoding: 'utf8',
          moveAfterRead: '/processed'
        }
      },
      {
        id: 'parse-1',
        type: 'code',
        name: 'Parse XML',
        position: { x: 400, y: 200 },
        parameters: {
          code: '// Parse XML content\nconst xml = $input.first().json.content;\n// Add XML parsing logic here\nreturn { json: { parsed: xml } };'
        }
      },
      {
        id: 'transform-1',
        type: 'set',
        name: 'Transform',
        position: { x: 700, y: 200 },
        parameters: {
          values: [
            { name: 'output', value: '{{ JSON.stringify($input) }}' }
          ]
        }
      }
    ],
    connections: [
      { id: 'conn-1', source: 'trigger-1', target: 'parse-1' },
      { id: 'conn-2', source: 'parse-1', target: 'transform-1' }
    ]
  },

  // LDAP/Auth Templates
  'ldap-user-sync': {
    name: 'LDAP User Sync',
    description: 'Synchronize users from LDAP/Active Directory',
    category: 'Authentication',
    tags: ['ldap', 'auth', 'users'],
    nodes: [
      {
        id: 'trigger-1',
        type: 'scheduleTrigger',
        name: 'Daily Sync',
        position: { x: 100, y: 200 },
        parameters: {
          rule: '0 2 * * *',
          timezone: 'UTC'
        }
      },
      {
        id: 'ldap-1',
        type: 'ldap',
        name: 'Search Users',
        position: { x: 400, y: 200 },
        parameters: {
          operation: 'search',
          baseDn: 'ou=users,dc=company,dc=com',
          filter: '(objectClass=person)',
          scope: 'sub',
          attributes: ['cn', 'mail', 'department']
        }
      },
      {
        id: 'transform-1',
        type: 'code',
        name: 'Format Users',
        position: { x: 700, y: 200 },
        parameters: {
          code: `const entries = $input.first().json.entries;
const users = entries.map(e => ({
  name: e.attributes.cn?.[0],
  email: e.attributes.mail?.[0],
  department: e.attributes.department?.[0]
}));
return { json: { users } };`
        }
      }
    ],
    connections: [
      { id: 'conn-1', source: 'trigger-1', target: 'ldap-1' },
      { id: 'conn-2', source: 'ldap-1', target: 'transform-1' }
    ]
  }
};

// List all templates
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { category, search } = req.query;

    let templates = Object.entries(workflowTemplates).map(([id, template]: [string, any]) => ({
      id,
      name: template.name,
      description: template.description,
      category: template.category,
      tags: template.tags
    }));

    // Filter by category
    if (category) {
      templates = templates.filter(t => t.category === category);
    }

    // Filter by search
    if (search) {
      const searchLower = (search as string).toLowerCase();
      templates = templates.filter(t =>
        t.name.toLowerCase().includes(searchLower) ||
        t.description.toLowerCase().includes(searchLower) ||
        t.tags.some((tag: string) => tag.toLowerCase().includes(searchLower))
      );
    }

    res.json({ success: true, data: templates });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create workflow from template
router.post('/:id/create', authMiddleware, async (req, res) => {
  try {
    const template = (workflowTemplates as any)[req.params.id];

    if (!template) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }

    const { name, description } = req.body;

    // Transform nodes - remove template IDs and ensure proper format
    const nodes = template.nodes.map((node: any) => ({
      id: crypto.randomUUID(),
      type: node.type,
      name: node.name,
      description: node.description || null,
      position: node.position,
      parameters: node.parameters || {}
    }));

    // Transform connections - use new node IDs
    const nodeIdMap = new Map(template.nodes.map((n: any, i: number) => [n.id, nodes[i].id]));
    const connections = template.connections.map((conn: any) => ({
      id: crypto.randomUUID(),
      source: nodeIdMap.get(conn.source) || conn.source,
      target: nodeIdMap.get(conn.target) || conn.target,
      sourceHandle: conn.sourceHandle || null,
      targetHandle: conn.targetHandle || null
    }));

    // Verify user exists before creating workflow
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true }
    });

    if (!user) {
      return res.status(401).json({ 
        success: false, 
        error: 'User not found. Please log out and log in again.' 
      });
    }

    const workflow = await prisma.workflow.create({
      data: {
        name: name || template.name,
        description: description || template.description,
        nodes,
        connections,
        userId: req.user!.id,
        active: false
      }
    });

    res.json({ success: true, data: workflow });
  } catch (error: any) {
    console.error('Template creation error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get template categories - MUST be before /:id route
router.get('/categories/list', authMiddleware, async (req, res) => {
  try {
    const categories = [...new Set(Object.values(workflowTemplates).map((t: any) => t.category))];
    res.json({ success: true, data: categories });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get single template - MUST be after specific routes
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const template = (workflowTemplates as any)[req.params.id];

    if (!template) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }

    res.json({
      success: true,
      data: {
        id: req.params.id,
        ...template
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
