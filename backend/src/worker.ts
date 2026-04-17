import { PrismaClient } from '@prisma/client';
import { Worker, Job } from 'bullmq';
import { registerAllNodes } from './nodes';
import { scheduler } from './engine/scheduler';
import { createWorker, redis, SchedulerControlJob } from './engine/queue';

const prisma = new PrismaClient();
const HEARTBEAT_KEY = 'worker:heartbeat';
const HEARTBEAT_INTERVAL_MS = 30_000;

function startHeartbeat() {
  const write = () => redis.set(HEARTBEAT_KEY, Date.now().toString(), 'EX', 120);
  write();
  return setInterval(write, HEARTBEAT_INTERVAL_MS);
}

function createSchedulerControlWorker() {
  const worker = new Worker<SchedulerControlJob>(
    'scheduler-control',
    async (job: Job<SchedulerControlJob>) => {
      const { action, workflowId, config } = job.data;
      if (action === 'schedule' && config) {
        await scheduler.scheduleWorkflow(workflowId, config);
      } else if (action === 'unschedule') {
        await scheduler.unscheduleWorkflow(workflowId);
      }
    },
    { connection: redis as any, concurrency: 5 }
  );
  worker.on('failed', (job, err) => console.error(`❌ Scheduler control job failed:`, err));
  return worker;
}

async function main() {
  try {
    console.log('🚀 Starting OrdoVertex Worker...');

    registerAllNodes();
    await scheduler.initialize();
    await prisma.$connect();
    console.log('✅ Database connected');

    createWorker();
    createSchedulerControlWorker();
    startHeartbeat();

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
