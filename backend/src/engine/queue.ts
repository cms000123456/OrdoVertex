import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { executeWorkflow } from './executor';
import logger from '../utils/logger';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const redis = new IORedis(redisUrl, { maxRetriesPerRequest: null });

export { redis };

// Define job types
export interface WorkflowJob {
  workflowId: string;
  userId: string;
  data: any;
  mode: 'manual' | 'webhook' | 'schedule';
  webhookResponseQueue?: string;
}

export interface SchedulerControlJob {
  action: 'schedule' | 'unschedule';
  workflowId: string;
  config?: { cron: string; timezone?: string };
}

// Create queues
export const workflowQueue = new Queue<WorkflowJob>('workflows', {
  connection: redis as any,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000
    },
    removeOnComplete: 100,
    removeOnFail: 50
  }
});

// Webhook response queue for async responses
export const webhookResponseQueue = new Queue('webhook-responses', {
  connection: redis as any
});

// Scheduler control queue — API sends commands, worker executes them
export const schedulerControlQueue = new Queue<SchedulerControlJob>('scheduler-control', {
  connection: redis as any,
  defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 500 }, removeOnComplete: 20, removeOnFail: 10 }
});

export async function sendSchedulerControl(action: 'schedule' | 'unschedule', workflowId: string, config?: { cron: string; timezone?: string }) {
  return schedulerControlQueue.add(action, { action, workflowId, config });
}

// Create worker
export function createWorker() {
  const worker = new Worker<WorkflowJob>(
    'workflows',
    async (job: Job<WorkflowJob>) => {
      const { workflowId, userId, data, mode } = job.data;
      
      logger.info(`🚀 Processing workflow job ${job.id}: ${workflowId} (${mode})`);
      
      try {
        const result = await executeWorkflow(workflowId, userId, data, mode);
        
        // If this is a webhook job with response queue, send response
        if (job.data.webhookResponseQueue) {
          await webhookResponseQueue.add('response', {
            queueId: job.data.webhookResponseQueue,
            result: result.result
          });
        }
        
        return result;
      } catch (error: any) {
        logger.error(`❌ Workflow job ${job.id} failed:`, error);
        throw error;
      }
    },
    {
      connection: redis as any,
      concurrency: 10,
      limiter: {
        max: 100,
        duration: 1000
      }
    }
  );

  worker.on('completed', (job) => {
    logger.info(`✅ Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    logger.error(`❌ Job ${job?.id} failed:`, err);
  });

  logger.info('✅ Workflow worker started');
  return worker;
}

// Queue helpers
export async function queueWorkflowExecution(
  workflowId: string,
  userId: string,
  data: any = {},
  mode: 'manual' | 'webhook' | 'schedule' = 'manual',
  webhookResponseQueueId?: string
): Promise<Job<WorkflowJob>> {
  return workflowQueue.add('execute', {
    workflowId,
    userId,
    data,
    mode,
    webhookResponseQueue: webhookResponseQueueId
  }) as Promise<Job<WorkflowJob>>;
}

export async function getQueueStats() {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    workflowQueue.getWaitingCount(),
    workflowQueue.getActiveCount(),
    workflowQueue.getCompletedCount(),
    workflowQueue.getFailedCount(),
    workflowQueue.getDelayedCount()
  ]);

  return { waiting, active, completed, failed, delayed };
}

export async function getFailedJobs(start = 0, end = 49) {
  const jobs = await workflowQueue.getFailed(start, end);
  return jobs.map(job => ({
    id: job.id,
    workflowId: job.data.workflowId,
    userId: job.data.userId,
    mode: job.data.mode,
    failedReason: job.failedReason,
    attemptsMade: job.attemptsMade,
    timestamp: job.timestamp,
    processedOn: job.processedOn,
    finishedOn: job.finishedOn
  }));
}

export async function retryFailedJob(jobId: string) {
  const job = await workflowQueue.getJob(jobId);
  if (!job) throw new Error(`Job ${jobId} not found`);
  await job.retry();
  return { retried: true, jobId };
}

export async function deleteFailedJob(jobId: string) {
  const job = await workflowQueue.getJob(jobId);
  if (!job) throw new Error(`Job ${jobId} not found`);
  await job.remove();
  return { deleted: true, jobId };
}
