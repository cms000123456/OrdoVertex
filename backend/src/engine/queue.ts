import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { executeWorkflow } from './executor';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const redis = new IORedis(redisUrl, { maxRetriesPerRequest: null });

// Define job types
export interface WorkflowJob {
  workflowId: string;
  userId: string;
  data: any;
  mode: 'manual' | 'webhook' | 'schedule';
  webhookResponseQueue?: string; // For webhook responses
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

// Create worker
export function createWorker() {
  const worker = new Worker<WorkflowJob>(
    'workflows',
    async (job: Job<WorkflowJob>) => {
      const { workflowId, userId, data, mode } = job.data;
      
      console.log(`🚀 Processing workflow job ${job.id}: ${workflowId} (${mode})`);
      
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
        console.error(`❌ Workflow job ${job.id} failed:`, error);
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
    console.log(`✅ Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`❌ Job ${job?.id} failed:`, err);
  });

  console.log('✅ Workflow worker started');
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

  return {
    waiting,
    active,
    completed,
    failed,
    delayed
  };
}
