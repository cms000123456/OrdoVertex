import { PrismaClient } from '@prisma/client';
import cron from 'node-cron';
import { queueWorkflowExecution } from './queue';

const prisma = new PrismaClient();

interface ScheduledJob {
  id: string;
  task: cron.ScheduledTask;
}

class WorkflowScheduler {
  private jobs: Map<string, ScheduledJob> = new Map();
  private isInitialized = false;

  async initialize() {
    if (this.isInitialized) return;

    console.log('🕐 Initializing workflow scheduler...');

    // Load all active schedule triggers from database
    const triggers = await prisma.trigger.findMany({
      where: {
        type: 'schedule',
        enabled: true
      },
      include: {
        workflow: true
      }
    });

    for (const trigger of triggers) {
      await this.scheduleWorkflow(trigger.workflowId, trigger.config as any);
    }

    this.isInitialized = true;
    console.log(`✅ Scheduler initialized with ${this.jobs.size} scheduled workflows`);
  }

  async scheduleWorkflow(workflowId: string, config: { cron: string; timezone?: string }) {
    try {
      // Validate cron expression
      if (!cron.validate(config.cron)) {
        console.error(`❌ Invalid cron expression: ${config.cron}`);
        return false;
      }

      // Stop existing job if any
      await this.unscheduleWorkflow(workflowId);

      // Create new scheduled task
      const task = cron.schedule(
        config.cron,
        async () => {
          console.log(`⏰ Scheduled trigger fired for workflow: ${workflowId}`);
          try {
            await queueWorkflowExecution(workflowId, '', {}, 'schedule');
            
            // Update last triggered time
            await prisma.trigger.updateMany({
              where: { workflowId, type: 'schedule' },
              data: { lastTriggered: new Date() }
            });
          } catch (error) {
            console.error(`❌ Scheduled execution failed for workflow ${workflowId}:`, error);
          }
        },
        {
          scheduled: true,
          timezone: config.timezone || 'UTC'
        }
      );

      this.jobs.set(workflowId, {
        id: workflowId,
        task
      });

      console.log(`✅ Scheduled workflow ${workflowId} with cron: ${config.cron}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to schedule workflow ${workflowId}:`, error);
      return false;
    }
  }

  async unscheduleWorkflow(workflowId: string) {
    const job = this.jobs.get(workflowId);
    if (job) {
      job.task.stop();
      this.jobs.delete(workflowId);
      console.log(`✅ Unscheduled workflow: ${workflowId}`);
      return true;
    }
    return false;
  }

  async updateSchedule(workflowId: string, config: { cron: string; timezone?: string }) {
    return this.scheduleWorkflow(workflowId, config);
  }

  getScheduledWorkflows(): string[] {
    return Array.from(this.jobs.keys());
  }

  isScheduled(workflowId: string): boolean {
    return this.jobs.has(workflowId);
  }

  async shutdown() {
    console.log('🛑 Shutting down scheduler...');
    for (const [id, job] of this.jobs) {
      job.task.stop();
      console.log(`✅ Stopped scheduled job: ${id}`);
    }
    this.jobs.clear();
    this.isInitialized = false;
  }
}

export const scheduler = new WorkflowScheduler();
