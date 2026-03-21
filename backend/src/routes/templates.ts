import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../utils/auth';
import { aiAgentTemplates } from '../utils/ai-templates';
import crypto from 'crypto';

const router = Router();
const prisma = new PrismaClient();

// All available templates
const workflowTemplates = {
  // Weather API Demo Template
  'demo-weather-api': {
    name: '🌤️ Demo: Weather API Integration',
    description: 'Fetch real weather data from a free API, transform it, and create a formatted report. No API key needed!',
    category: 'Demo',
    tags: ['demo', 'weather', 'api', 'http', 'transform'],
    nodes: [
      {
        id: 'trigger-1',
        type: 'manualTrigger',
        name: 'Manual Trigger',
        description: 'Click Execute to fetch weather data',
        position: { x: 100, y: 200 },
        parameters: {}
      },
      {
        id: 'set-1',
        type: 'set',
        name: 'Set Location',
        description: 'Define the city to check weather for',
        position: { x: 350, y: 200 },
        parameters: {
          mode: 'manual',
          values: [
            { name: 'city', value: 'London' },
            { name: 'country', value: 'UK' }
          ]
        }
      },
      {
        id: 'http-1',
        type: 'httpRequest',
        name: 'Fetch Weather Data',
        description: 'Get weather from wttr.in (free, no API key)',
        position: { x: 600, y: 200 },
        parameters: {
          method: 'GET',
          url: 'https://wttr.in/{{ $json.city }}?format=j1',
          headers: {
            'Accept': 'application/json'
          }
        }
      },
      {
        id: 'code-1',
        type: 'code',
        name: 'Transform Weather Data',
        description: 'Extract and format useful weather information',
        position: { x: 900, y: 200 },
        parameters: {
          code: `// Get weather data from HTTP response
const weather = items[0]?.json || {};
const current = weather.current_condition?.[0];
const request = weather.request?.[0];

if (!current) {
  return [{ json: { error: 'No weather data available' } }];
}

// Extract and transform useful data
const transformed = {
  location: request?.query || 'Unknown',
  date: new Date().toISOString().split('T')[0],
  temperature: {
    celsius: parseInt(current.temp_C),
    fahrenheit: parseInt(current.temp_F),
    feelsLike: parseInt(current.FeelsLikeC)
  },
  condition: current.weatherDesc?.[0]?.value || 'Unknown',
  humidity: current.humidity + '%',
  wind: {
    speed: current.windspeedKmph + ' km/h',
    direction: current.winddir16Point
  },
  visibility: current.visibility + ' km',
  pressure: current.pressure + ' hPa',
  uvIndex: current.uvIndex,
  // Add helpful recommendations
  recommendations: []
};

// Add contextual recommendations
if (transformed.temperature.celsius > 25) {
  transformed.recommendations.push('☀️ It\'s hot! Stay hydrated and use sunscreen.');
} else if (transformed.temperature.celsius < 5) {
  transformed.recommendations.push('❄️ It\'s cold! Wear warm clothing.');
}

if (parseInt(current.uvIndex) > 5) {
  transformed.recommendations.push('😎 High UV index! Wear sunglasses and seek shade.');
}

if (current.weatherDesc?.[0]?.value?.toLowerCase().includes('rain')) {
  transformed.recommendations.push('☔ Rain expected! Bring an umbrella.');
}

// Create a summary
transformed.summary = `Currently ${transformed.condition.toLowerCase()} with ${transformed.temperature.celsius}C in ${transformed.location}.`;

return [{ json: transformed }];`
        }
      },
      {
        id: 'code-2',
        type: 'code',
        name: 'Format Report',
        description: 'Create a human-readable weather report',
        position: { x: 1200, y: 200 },
        parameters: {
          code: `const data = items[0]?.json || {};

const report = {
  title: '🌤️ Weather Report for ' + data.location,
  generated: new Date().toISOString(),
  report: `
📍 Location: ${data.location}
📅 Date: ${data.date}

🌡️ Temperature: ${data.temperature.celsius}°C (feels like ${data.temperature.feelsLike}°C)
☁️ Condition: ${data.condition}
💧 Humidity: ${data.humidity}
💨 Wind: ${data.wind.speed} from ${data.wind.direction}
👁️ Visibility: ${data.visibility}
📊 Pressure: ${data.pressure}
☀️ UV Index: ${data.uvIndex}

💡 Recommendations:
${data.recommendations.length > 0 ? data.recommendations.map(r => '  • ' + r).join('\\n') : '  • No special recommendations today!'}

📝 Summary: ${data.summary}
  `.trim(),
  raw_data: data
};

return [{ json: report }];`
        }
      },
      {
        id: 'set-2',
        type: 'set',
        name: 'Final Output',
        description: 'Add metadata to the output',
        position: { x: 1500, y: 200 },
        parameters: {
          mode: 'manual',
          values: [
            { name: 'workflow_name', value: 'Weather API Demo' },
            { name: 'completed_at', value: '{{ $now }}' },
            { name: 'source', value: 'wttr.in (Free Weather API)' }
          ]
        }
      }
    ],
    connections: [
      { source: 'trigger-1', target: 'set-1' },
      { source: 'set-1', target: 'http-1' },
      { source: 'http-1', target: 'code-1' },
      { source: 'code-1', target: 'code-2' },
      { source: 'code-2', target: 'set-2' }
    ]
  },

  // Tutorial Template
  'demo-crypto-prices': {
    name: '💰 Demo: Crypto Price Tracker',
    description: 'Fetch real-time cryptocurrency prices and calculate portfolio value. No API key needed!',
    category: 'Demo',
    tags: ['demo', 'crypto', 'finance', 'api', 'calculation'],
    nodes: [
      {
        id: 'trigger-1',
        type: 'manualTrigger',
        name: 'Manual Trigger',
        description: 'Click Execute to fetch crypto prices',
        position: { x: 100, y: 200 },
        parameters: {}
      },
      {
        id: 'set-1',
        type: 'set',
        name: 'Define Holdings',
        description: 'Set your cryptocurrency holdings',
        position: { x: 350, y: 200 },
        parameters: {
          mode: 'manual',
          values: [
            { name: 'portfolio', value: '{"bitcoin": 0.5, "ethereum": 4.2, "cardano": 1500}' }
          ]
        }
      },
      {
        id: 'http-1',
        type: 'httpRequest',
        name: 'Fetch Crypto Prices',
        description: 'Get prices from CoinGecko API (free, no key)',
        position: { x: 600, y: 200 },
        parameters: {
          method: 'GET',
          url: 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,cardano&vs_currencies=usd,eur&include_24hr_change=true',
          headers: {
            'Accept': 'application/json'
          }
        }
      },
      {
        id: 'code-1',
        type: 'code',
        name: 'Calculate Portfolio Value',
        description: 'Calculate total value and 24h changes',
        position: { x: 900, y: 200 },
        parameters: {
          code: `// Get data from previous nodes
const prices = items[0]?.json || {};
const holdings = JSON.parse(items[0]?.json?.portfolio || '{}');

// Define coin mapping
const coinMap = {
  bitcoin: { symbol: 'BTC', name: 'Bitcoin' },
  ethereum: { symbol: 'ETH', name: 'Ethereum' },
  cardano: { symbol: 'ADA', name: 'Cardano' }
};

// Calculate portfolio value
const portfolio = [];
let totalUSD = 0;
let totalEUR = 0;

for (const [coinId, amount] of Object.entries(holdings)) {
  const priceData = prices[coinId];
  const coinInfo = coinMap[coinId];
  
  if (priceData && coinInfo) {
    const valueUSD = amount * priceData.usd;
    const valueEUR = amount * priceData.eur;
    const change24h = priceData.usd_24h_change || 0;
    
    portfolio.push({
      coin: coinInfo.name,
      symbol: coinInfo.symbol,
      amount: amount,
      priceUSD: priceData.usd,
      priceEUR: priceData.eur,
      valueUSD: valueUSD,
      valueEUR: valueEUR,
      change24h: change24h.toFixed(2) + '%',
      trend: change24h >= 0 ? '📈' : '📉'
    });
    
    totalUSD += valueUSD;
    totalEUR += valueEUR;
  }
}

// Sort by value (highest first)
portfolio.sort((a, b) => b.valueUSD - a.valueUSD);

return [{ json: {
  portfolio: portfolio,
  totals: {
    usd: totalUSD.toFixed(2),
    eur: totalEUR.toFixed(2)
  },
  coinCount: portfolio.length,
  generatedAt: new Date().toISOString()
} }];`
        }
      },
      {
        id: 'code-2',
        type: 'code',
        name: 'Format Report',
        description: 'Create a formatted portfolio report',
        position: { x: 1200, y: 200 },
        parameters: {
          code: `const data = items[0]?.json || {};

// Format each coin
const coinLines = data.portfolio.map(c => 
  `${c.trend} ${c.symbol} | ${c.amount} coins | $${c.priceUSD.toLocaleString()} | Value: $${c.valueUSD.toLocaleString()} (${c.change24h})`
).join('\\n');

const report = {
  title: '💰 Crypto Portfolio Report',
  generated: data.generatedAt,
  summary: `${data.coinCount} coins | Total Value: $${data.totals.usd} / €${data.totals.eur}`,
  report: `
═══════════════════════════════════════════════════════════════
💰 CRYPTO PORTFOLIO REPORT
Generated: ${new Date(data.generatedAt).toLocaleString()}
═══════════════════════════════════════════════════════════════

📊 HOLDINGS:
${coinLines}

💵 TOTAL PORTFOLIO VALUE:
  USD: $${parseFloat(data.totals.usd).toLocaleString()}
  EUR: €${parseFloat(data.totals.eur).toLocaleString()}

💡 Tip: Prices are fetched from CoinGecko API in real-time.
═══════════════════════════════════════════════════════════════
  `.trim(),
  raw_data: data
};

return [{ json: report }];`
        }
      }
    ],
    connections: [
      { source: 'trigger-1', target: 'set-1' },
      { source: 'set-1', target: 'http-1' },
      { source: 'http-1', target: 'code-1' },
      { source: 'code-1', target: 'code-2' }
    ]
  },

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
          code: `// Transform data for target\nconst rows = items;\nreturn rows.map(r => ({\n  json: {\n    ...r.json,\n    synced_at: new Date().toISOString()\n  }\n}));`
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
          code: `const error = items[0]?.json || {};
return [{
  json: {
    subject: 'Error: ' + error.service,
    body: \`
Service: \${error.service}
Time: \${error.timestamp}
Error: \${error.message}
Stack: \${error.stack}
    \`.trim()
  }
}];`
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
          code: `// Parse XML content\nconst xml = items[0]?.json?.content || '';\n// Add XML parsing logic here\nreturn [{ json: { parsed: xml } }];`
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
          code: `const entries = items[0]?.json?.entries || [];\nconst users = entries.map(e => ({\n  name: e.attributes.cn?.[0],\n  email: e.attributes.mail?.[0],\n  department: e.attributes.department?.[0]\n}));\nreturn [{ json: { users } }];`
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
