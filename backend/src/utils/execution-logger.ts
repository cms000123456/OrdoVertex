import { LogLevel } from '@prisma/client';
import { prisma } from '../prisma';
import logger from '../utils/logger';


interface LogEntry {
  executionId: string;
  level: LogLevel;
  message: string;
  nodeId?: string;
  nodeName?: string;
  details?: any;
  metadata?: any;
}

export class ExecutionLogger {
  private executionId: string;
  private buffer: LogEntry[] = [];
  private flushInterval: NodeJS.Timeout | null = null;

  constructor(executionId: string) {
    this.executionId = executionId;
    this.startAutoFlush();
  }

  private startAutoFlush() {
    // Flush logs every 2 seconds
    this.flushInterval = setInterval(() => {
      this.flush();
    }, 2000);
  }

  async log(level: LogLevel, message: string, options?: {
    nodeId?: string;
    nodeName?: string;
    details?: any;
    metadata?: any;
  }) {
    const entry: LogEntry = {
      executionId: this.executionId,
      level,
      message,
      ...options
    };

    this.buffer.push(entry);

    // Flush immediately for errors
    if (level === 'error') {
      await this.flush();
    }
  }

  async debug(message: string, options?: Omit<LogEntry, 'executionId' | 'level' | 'message'>) {
    await this.log('debug', message, options);
  }

  async info(message: string, options?: Omit<LogEntry, 'executionId' | 'level' | 'message'>) {
    await this.log('info', message, options);
  }

  async warn(message: string, options?: Omit<LogEntry, 'executionId' | 'level' | 'message'>) {
    await this.log('warn', message, options);
  }

  async error(message: string, options?: Omit<LogEntry, 'executionId' | 'level' | 'message'>) {
    await this.log('error', message, options);
  }

  async flush() {
    if (this.buffer.length === 0) return;

    const logsToWrite = [...this.buffer];
    this.buffer = [];

    try {
      await prisma.executionLog.createMany({
        data: logsToWrite.map(entry => ({
          executionId: entry.executionId,
          level: entry.level,
          message: entry.message,
          nodeId: entry.nodeId,
          nodeName: entry.nodeName,
          details: entry.details,
          metadata: entry.metadata
        }))
      });
    } catch (err) {
      logger.error('Failed to write execution logs:', err);
      // Put logs back in buffer to retry
      this.buffer.unshift(...logsToWrite);
    }
  }

  async destroy() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    await this.flush();
  }
}

// Global logger instance cache
const loggers = new Map<string, ExecutionLogger>();

export function getExecutionLogger(executionId: string): ExecutionLogger {
  if (!loggers.has(executionId)) {
    loggers.set(executionId, new ExecutionLogger(executionId));
  }
  return loggers.get(executionId)!;
}

export function removeExecutionLogger(executionId: string) {
  const logger = loggers.get(executionId);
  if (logger) {
    logger.destroy();
    loggers.delete(executionId);
  }
}
