#!/usr/bin/env node
/**
 * Add Tutorial Workflow Script
 * 
 * Creates the "Data Flow Demo" tutorial workflow for new/existing installations.
 * This workflow demonstrates how data flows between nodes and helps users
 * understand the Node Inspector feature.
 * 
 * Usage:
 *   docker compose exec api npx ts-node /app/scripts/add-tutorial-workflow.js
 *   
 * Or from host:
 *   docker cp scripts/add-tutorial-workflow.js ordovertex-api:/tmp/ && docker compose exec api npx ts-node /tmp/add-tutorial-workflow.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const TUTORIAL_WORKFLOW = {
  name: '📚 Tutorial: Data Flow Demo',
  description: 'A hands-on tutorial workflow to understand how data flows between nodes. Open the Node Inspector to see input/output data at each step!',
  nodes: [
    {
      id: 'trigger-1',
      name: 'When called via Webhook',
      type: 'webhook',
      description: 'Triggers when webhook URL is called',
      position: { x: 100, y: 200 },
      parameters: {
        path: 'tutorial-demo',
        method: 'POST',
        responseMode: 'responseNode'
      }
    },
    {
      id: 'code-1',
      name: 'Generate Sample Data',
      type: 'code',
      description: 'Creates sample user data to demonstrate data flow',
      position: { x: 400, y: 200 },
      parameters: {
        code: `// Generate sample data
const users = [
  { id: 1, name: 'Alice', role: 'admin', department: 'Engineering' },
  { id: 2, name: 'Bob', role: 'user', department: 'Marketing' },
  { id: 3, name: 'Carol', role: 'user', department: 'Engineering' }
];

// Add timestamp and metadata
const result = {
  generatedAt: new Date().toISOString(),
  count: users.length,
  users: users,
  source: 'tutorial-workflow'
};

// Return as items array (standard OrdoVertex format)
return [{ json: result }];`
      }
    },
    {
      id: 'code-2',
      name: 'Transform Data',
      type: 'code',
      description: 'Filters Engineering users and adds computed fields',
      position: { x: 700, y: 200 },
      parameters: {
        code: `// Get input data from previous node
const inputItems = $input.all();
const inputData = inputItems[0]?.json || {};

// Filter for Engineering department only
const engineeringUsers = (inputData.users || []).filter(
  user => user.department === 'Engineering'
);

// Add computed fields
const transformedUsers = engineeringUsers.map(user => ({
  ...user,
  email: \`\${user.name.toLowerCase()}@company.com\`,
  accessLevel: user.role === 'admin' ? 'full' : 'limited',
  computedAt: new Date().toISOString()
}));

// Return transformed data
const result = {
  originalCount: inputData.count,
  filteredCount: transformedUsers.length,
  department: 'Engineering',
  users: transformedUsers,
  transformationApplied: 'filter-by-department + enrich-fields'
};

return [{ json: result }];`
      }
    },
    {
      id: 'respond-1',
      name: 'Return Response',
      type: 'respondToWebhook',
      description: 'Sends the final result back to the caller',
      position: { x: 1000, y: 200 },
      parameters: {
        statusCode: 200,
        respondWith: 'allIncomingItems'
      }
    }
  ],
  connections: [
    {
      source: 'trigger-1',
      sourceHandle: 'default',
      target: 'code-1',
      targetHandle: 'input'
    },
    {
      source: 'code-1',
      sourceHandle: 'default',
      target: 'code-2',
      targetHandle: 'input'
    },
    {
      source: 'code-2',
      sourceHandle: 'default',
      target: 'respond-1',
      targetHandle: 'input'
    }
  ],
  settings: {
    timezone: 'UTC',
    saveExecutionProgress: true,
    saveManualExecutions: true
  }
};

async function main() {
  console.log('🔧 Adding tutorial workflow...\n');
  
  // Get first admin user
  const admin = await prisma.user.findFirst({
    where: { role: 'admin' },
    orderBy: { createdAt: 'asc' }
  });
  
  if (!admin) {
    console.error('❌ No admin user found. Please create an admin user first.');
    process.exit(1);
  }
  
  console.log(`Found admin user: ${admin.email}`);
  
  // Check if tutorial already exists
  const existing = await prisma.workflow.findFirst({
    where: {
      userId: admin.id,
      name: TUTORIAL_WORKFLOW.name
    }
  });
  
  if (existing) {
    console.log('ℹ️  Tutorial workflow already exists. Skipping.');
    console.log(`   Workflow ID: ${existing.id}`);
    process.exit(0);
  }
  
  // Create tutorial workflow
  const workflow = await prisma.workflow.create({
    data: {
      name: TUTORIAL_WORKFLOW.name,
      description: TUTORIAL_WORKFLOW.description,
      userId: admin.id,
      nodes: TUTORIAL_WORKFLOW.nodes,
      connections: TUTORIAL_WORKFLOW.connections,
      settings: TUTORIAL_WORKFLOW.settings,
      active: true
    }
  });
  
  console.log('\n✅ Tutorial workflow created successfully!');
  console.log(`   Workflow ID: ${workflow.id}`);
  console.log(`   Name: ${workflow.name}`);
  console.log(`\n📖 Next steps:`);
  console.log(`   1. Open the workflow in the UI`);
  console.log(`   2. Click "Execute" to run it`);
  console.log(`   3. Click on any node to see Input/Output data in the Node Inspector`);
  console.log(`\n🔗 Webhook URL: POST http://localhost:3001/webhook/tutorial-demo`);
}

main()
  .catch((e) => {
    console.error('❌ Error:', e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
