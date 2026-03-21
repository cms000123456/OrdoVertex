#!/bin/bash
# Add Tutorial Workflow Script
# Creates the "Data Flow Demo" tutorial workflow for OrdoVertex
# Usage: ./add-tutorial.sh

set -e

echo "🔧 Adding tutorial workflow to OrdoVertex..."

# Check if running in the right directory
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ Error: docker-compose.yml not found. Please run this script from the OrdoVertex root directory."
    exit 1
fi

# Create the JavaScript file for creating the tutorial workflow
cat > /tmp/create-tutorial-workflow.js << 'EOF'
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const TUTORIAL_WORKFLOW = {
  name: '📚 Tutorial: Data Flow Demo',
  description: 'A hands-on tutorial workflow to understand how data flows between nodes. Open the Node Inspector to see input/output data at each step!',
  nodes: [
    {
      id: 'trigger-1',
      name: 'Manual Trigger',
      type: 'manualTrigger',
      description: 'Click Execute to run this workflow',
      position: { x: 100, y: 200 },
      parameters: {}
    },
    {
      id: 'code-1',
      name: 'Generate Sample Data',
      type: 'code',
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
      name: 'Transform Data',
      type: 'code',
      description: 'Filters Engineering users and adds computed fields',
      position: { x: 700, y: 200 },
      parameters: {
        code: `const items = $input.all();
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
      name: 'Final Result',
      type: 'set',
      description: 'Formats the final output',
      position: { x: 1000, y: 200 },
      parameters: {
        values: {
          summary: 'Tutorial workflow completed successfully',
          timestamp: '{{ $now }}'
        }
      }
    }
  ],
  connections: [
    { source: 'trigger-1', sourceHandle: 'default', target: 'code-1', targetHandle: 'input' },
    { source: 'code-1', sourceHandle: 'default', target: 'code-2', targetHandle: 'input' },
    { source: 'code-2', sourceHandle: 'default', target: 'set-1', targetHandle: 'input' }
  ],
  settings: {
    timezone: 'UTC',
    saveExecutionProgress: true,
    saveManualExecutions: true
  }
};

async function main() {
  console.log('Connecting to database...');
  
  const admin = await prisma.user.findFirst({
    where: { role: 'admin' },
    orderBy: { createdAt: 'asc' }
  });
  
  if (!admin) {
    console.error('❌ No admin user found. Please create an admin user first.');
    process.exit(1);
  }
  
  console.log(`Found admin user: ${admin.email}`);
  
  const existing = await prisma.workflow.findFirst({
    where: { userId: admin.id, name: TUTORIAL_WORKFLOW.name }
  });
  
  if (existing) {
    console.log('ℹ️  Tutorial workflow already exists.');
    console.log(`   Workflow ID: ${existing.id}`);
    process.exit(0);
  }
  
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
  console.log(`\n📖 Next steps:`);
  console.log(`   1. Open the OrdoVertex UI`);
  console.log(`   2. Find the "📚 Tutorial: Data Flow Demo" workflow`);
  console.log(`   3. Click "Execute" to run it`);
  console.log(`   4. Click on any node to see Input/Output data in the Node Inspector`);
  console.log(`\n💡 The workflow shows how data flows from the Manual Trigger → Generate Data → Transform Data → Final Result`);
}

main()
  .catch(e => {
    console.error('❌ Error:', e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
EOF

# Copy the script to the API container's /app directory
echo "📦 Copying script to container..."
docker cp /tmp/create-tutorial-workflow.js ordovertex-api:/app/create-tutorial-workflow.js

# Run the script inside the container (from /app so it can find node_modules)
echo "🚀 Creating tutorial workflow..."
docker compose exec api node /app/create-tutorial-workflow.js

# Cleanup (remove from container and local)
docker compose exec api rm -f /app/create-tutorial-workflow.js
rm -f /tmp/create-tutorial-workflow.js

echo ""
echo "✨ Done!"
