import type { Prisma } from "@prisma/client";
import { prisma } from "../prisma";

export type AuditLogCreateInput = {
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  listId?: string | null;
  metadata?: Prisma.InputJsonValue;
  ip?: string;
  userAgent?: string;
};

export function create(input: AuditLogCreateInput) {
  return prisma.auditLog.create({
    data: {
      userId: input.userId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      listId: input.listId,
      metadata: input.metadata,
      ip: input.ip,
      userAgent: input.userAgent
    },
    select: {
      id: true,
      createdAt: true
    }
  });
}
