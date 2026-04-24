import { prisma } from '../prisma';
import { Request } from 'express';
import { Prisma } from '@prisma/client';
import logger from './logger';

export type AuditAction =
  | 'user.create'
  | 'user.delete'
  | 'user.update_role'
  | 'workflow.delete'
  | 'workflow.bulk_delete'
  | 'workflow.admin_delete'
  | 'credential.delete'
  | 'credential.bulk_delete'
  | 'credential.decrypt'
  | 'saml_config.create'
  | 'saml_config.update'
  | 'saml_config.delete'
  | 'system.settings_update'
  | 'admin.workflow_move'
  | 'admin.workflow_toggle';

export interface AuditContext {
  actorId: string;
  action: AuditAction;
  targetId?: string;
  targetType?: string;
  details?: Record<string, unknown>;
  req?: Request;
}

export async function logAudit(context: AuditContext): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: context.action,
        actorId: context.actorId,
        targetId: context.targetId ?? null,
        targetType: context.targetType ?? null,
        details: (context.details ?? null) as any,
        ipAddress: context.req?.ip ?? null,
        userAgent: context.req?.headers['user-agent'] ?? null
      }
    });
  } catch (err) {
    logger.error('[Audit] Failed to write audit log:', err);
  }
}
