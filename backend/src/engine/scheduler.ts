import { prisma } from '../prisma';
import cron from 'node-cron';
import { queueWorkflowExecution } from './queue';
import logger from '../utils/logger';


interface ScheduledJob {
  id: string;
  task: cron.ScheduledTask;
}

class WorkflowScheduler {
  private jobs: Map<string, ScheduledJob> = new Map();
  private isInitialized = false;

  async initialize() {
    if (this.isInitialized) return;

    logger.info('🕐 Initializing workflow scheduler...');

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
    logger.info(`✅ Scheduler initialized with ${this.jobs.size} scheduled workflows`);
  }

  async scheduleWorkflow(workflowId: string, config: { cron: string; timezone?: string }) {
    try {
      // Validate cron expression
      if (!cron.validate(config.cron)) {
        logger.error(`❌ Invalid cron expression: ${config.cron}`);
        return false;
      }

      // Normalize timezone: GMT+X is not a valid IANA name; convert to Etc/GMT-X (sign reversed)
      const resolveTimezone = (tz: string): string => {
        const gmtMatch = tz.match(/^GMT([+-])(\d{1,2})$/i);
        if (gmtMatch) {
          const flipped = gmtMatch[1] === '+' ? '-' : '+';
          return `Etc/GMT${flipped}${gmtMatch[2]}`;
        }
        return tz;
      };

      const rawTz = (config.timezone || 'UTC').trim();
      const timezone = resolveTimezone(rawTz);
      if (timezone !== rawTz) {
        logger.warn(`⚠️  Timezone "${rawTz}" converted to IANA format "${timezone}"`);
      }

      // Stop existing job if any
      await this.unscheduleWorkflow(workflowId);

      // Create new scheduled task
      const task = cron.schedule(
        config.cron,
        async () => {
          logger.info(`⏰ Scheduled trigger fired for workflow: ${workflowId}`);
          try {
            const workflow = await prisma.workflow.findFirst({ where: { id: workflowId, deletedAt: null }, select: { userId: true } });
            if (!workflow) {
              logger.error(`❌ Workflow ${workflowId} not found, skipping scheduled execution`);
              return;
            }
            const execution = await prisma.workflowExecution.create({
              data: { workflowId, status: 'waiting', mode: 'schedule' }
            });
            await queueWorkflowExecution(workflowId, workflow.userId, {}, 'schedule', execution.id);

            // Update last triggered time
            await prisma.trigger.updateMany({
              where: { workflowId, type: 'schedule' },
              data: { lastTriggered: new Date() }
            });
          } catch (error) {
            logger.error(`❌ Scheduled execution failed for workflow ${workflowId}:`, error);
          }
        },
        {
          scheduled: true,
          timezone
        }
      );

      this.jobs.set(workflowId, {
        id: workflowId,
        task
      });

      logger.info(`✅ Scheduled workflow ${workflowId} with cron: ${config.cron}`);
      return true;
    } catch (error) {
      logger.error(`❌ Failed to schedule workflow ${workflowId}:`, error);
      return false;
    }
  }

  async unscheduleWorkflow(workflowId: string) {
    const job = this.jobs.get(workflowId);
    if (job) {
      job.task.stop();
      this.jobs.delete(workflowId);
      logger.info(`✅ Unscheduled workflow: ${workflowId}`);
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
    logger.info('🛑 Shutting down scheduler...');
    for (const [id, job] of this.jobs) {
      job.task.stop();
      logger.info(`✅ Stopped scheduled job: ${id}`);
    }
    this.jobs.clear();
    this.isInitialized = false;
  }
}

export const scheduler = new WorkflowScheduler();
