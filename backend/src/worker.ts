import { PrismaClient } from '@prisma/client';
import { registerAllNodes } from './nodes';
import { scheduler } from './engine/scheduler';
import { createWorker } from './engine/queue';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🚀 Starting OrdoVertex Worker...');

    // Register all nodes
    registerAllNodes();

    // Initialize scheduler
    await scheduler.initialize();

    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connected');

    // Start the worker
    createWorker();

    console.log(`
✅ OrdoVertex Worker is running

Processing jobs from queue...
Press Ctrl+C to stop.
    `);

  } catch (error) {
    console.error('Failed to start worker:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await scheduler.shutdown();
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await scheduler.shutdown();
  await prisma.$disconnect();
  process.exit(0);
});

main();
