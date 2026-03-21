import { PrismaClient, UserRole } from '@prisma/client';
import { hashPassword } from '../src/utils/auth';

const prisma = new PrismaClient();

// Default credentials for fresh installs (development only)
const DEFAULT_ADMIN_EMAIL = 'admin@example.com';
const DEFAULT_ADMIN_PASSWORD = 'admin123';

// Tutorial workflow demonstrating data flow
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

// Return as items array (standard n8n/OrdoVertex format)
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
        code: `// Get input data from previous node (items is already provided)
const inputData = items[0]?.json || {};

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
      id: 'set-1',
      name: 'Final Result',
      type: 'set',
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
      target: 'set-1',
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
  const adminEmail = process.env.ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD;

  // Check if any admin already exists
  const existingAdmin = await prisma.user.findFirst({
    where: { role: UserRole.admin }
  });

  let admin;

  if (existingAdmin) {
    console.log('ℹ️  Admin user already exists, skipping user seed');
    admin = existingAdmin;
  } else {
    // Check if user with this email exists
    const existingUser = await prisma.user.findUnique({
      where: { email: adminEmail }
    });

    if (existingUser) {
      // Promote to admin
      admin = await prisma.user.update({
        where: { email: adminEmail },
        data: { role: UserRole.admin }
      });
      console.log(`✅ Existing user ${adminEmail} promoted to admin`);
    } else {
      // Check if using default credentials
      const isUsingDefaultCredentials = adminEmail === DEFAULT_ADMIN_EMAIL && adminPassword === DEFAULT_ADMIN_PASSWORD;
      
      // Create new admin user
      const hashedPassword = await hashPassword(adminPassword);
      
      admin = await prisma.user.create({
        data: {
          email: adminEmail,
          password: hashedPassword,
          name: 'Admin',
          role: UserRole.admin,
          onboardingCompleted: !isUsingDefaultCredentials  // Force onboarding if using defaults
        }
      });

      console.log(`✅ Admin user created: ${admin.email}`);
      if (isUsingDefaultCredentials) {
        console.log(`   ⚠️  Using default credentials. You will be required to change email/password on first login!`);
        console.log(`   Email: ${DEFAULT_ADMIN_EMAIL}`);
        console.log(`   Password: ${DEFAULT_ADMIN_PASSWORD}`);
      }
    }
  }

  // Check if tutorial workflow already exists
  const existingTutorial = await prisma.workflow.findFirst({
    where: {
      userId: admin.id,
      name: TUTORIAL_WORKFLOW.name
    }
  });

  if (!existingTutorial) {
    // Create tutorial workflow
    const tutorialWorkflow = await prisma.workflow.create({
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

    console.log(`✅ Tutorial workflow created: ${tutorialWorkflow.name}`);
    console.log(`   📋 Workflow ID: ${tutorialWorkflow.id}`);
    console.log(`   💡 Click "Execute" in the workflow editor to run and test the data flow`);
    console.log(`   📖 Nodes: Webhook Trigger → Generate Data → Transform Data → Response`);
    console.log(`   💡 Tip: Open the workflow and click on each node to inspect input/output data!`);
  } else {
    console.log('ℹ️  Tutorial workflow already exists, skipping');
  }
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
