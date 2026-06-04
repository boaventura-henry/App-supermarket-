import type { Prisma } from "@prisma/client";
import { getRequestContext } from "../http/requestContext";
import { logger } from "../logger";
import * as auditLogRepository from "../repositories/auditLogRepository";

export type AuditAction =
  | "LIST_CREATED"
  | "LIST_UPDATED"
  | "LIST_DELETED"
  | "PRODUCT_CREATED"
  | "PRODUCT_UPDATED"
  | "PRODUCT_DELETED"
  | "PRODUCT_PURCHASED"
  | "PRODUCT_UNPURCHASED"
  | "SHARE_CREATED"
  | "SHARE_UPDATED"
  | "SHARE_REMOVED"
  | "INVITE_CREATED"
  | "INVITE_ACCEPTED"
  | "INVITE_DECLINED"
  | "INVITE_CANCELED"
  | "IMPORT_STARTED"
  | "IMPORT_COMPLETED"
  | "IMPORT_FAILED";

type AuditInput = {
  userId: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  listId?: string | null;
  metadata?: Prisma.InputJsonValue;
};

export async function recordAudit(input: AuditInput) {
  const context = getRequestContext();
  try {
    await auditLogRepository.create({
      ...input,
      ip: context?.ip?.slice(0, 128),
      userAgent: context?.userAgent?.slice(0, 512)
    });
  } catch (error) {
    logger.error("audit.write.failed", error, {
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId
    });
  }
}
