import { validateEnvOrExit } from './utils/env-validation';
validateEnvOrExit();

import { prisma } from './prisma';
import { Worker, Job } from 'bullmq';
import { registerAllNodes } from './nodes';
import { scheduler } from './engine/scheduler';
import { createWorker, redis, SchedulerControlJob } from './engine/queue';
import logger from './utils/logger';

const HEARTBEAT_KEY = 'worker:heartbeat';
const HEARTBEAT_INTERVAL_MS = 30_000;

let workflowWorker: Worker | undefined;
let schedulerControlWorker: Worker | undefined;
let heartbeatInterval: ReturnType<typeof setInterval> | undefined;

function startHeartbeat() {
  const write = () => redis.set(HEARTBEAT_KEY, Date.now().toString(), 'EX', 120);
  write();
  heartbeatInterval = setInterval(write, HEARTBEAT_INTERVAL_MS);
}

function createSchedulerControlWorker() {
  schedulerControlWorker = new Worker<SchedulerControlJob>(
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
  schedulerControlWorker.on('failed', (job, err) => logger.error(`❌ Scheduler control job failed:`, err));
}

async function main() {
  try {
    logger.info('🚀 Starting OrdoVertex Worker...');

    registerAllNodes();
    await scheduler.initialize();
    await prisma.$connect();
    logger.info('✅ Database connected');

    workflowWorker = createWorker();
    createSchedulerControlWorker();
    startHeartbeat();

    logger.info(`
✅ OrdoVertex Worker is running

Processing jobs from queue...
Press Ctrl+C to stop.
    `);

  } catch (error) {
    logger.error('Failed to start worker:', error);
    process.exit(1);
  }
}

// Graceful shutdown
async function shutdown(signal: string) {
  logger.info(`${signal} received, shutting down gracefully...`);
  if (heartbeatInterval) clearInterval(heartbeatInterval);
  if (workflowWorker) await workflowWorker.close();
  if (schedulerControlWorker) await schedulerControlWorker.close();
  await scheduler.shutdown();
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

main();
