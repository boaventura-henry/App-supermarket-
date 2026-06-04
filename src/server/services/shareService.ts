import type { ListAccessRole } from "@prisma/client";
import { requireListOwner, resolveListId, resolveUserId } from "../auth/listPermissions";
import { AppError } from "../errors";
import { isUniqueConstraintError } from "../prismaErrors";
import * as shareRepository from "../repositories/shareRepository";
import { requireEmail, requireIdentifier } from "../validation/common";
import { recordAudit } from "./auditLogService";
import { createNotification } from "./notificationService";

export type SharePayload = {
  userId?: unknown;
  email?: unknown;
  role?: unknown;
};

export async function getShares(listId: unknown, userId: unknown) {
  const currentUser = await resolveUserId(requireIdentifier(userId, "Informe o userId."));
  const list = await resolveListId(requireIdentifier(listId, "Informe o id da lista."));
  await requireListOwner(currentUser.id, list.id);
  const shares = await shareRepository.findSharesByList(list.id);
  return shares.map(mapShare);
}

export async function createShare(listId: unknown, payload: SharePayload) {
  const currentUser = await resolveUserId(requireIdentifier(payload.userId, "Informe o userId."));
  const list = await resolveListId(requireIdentifier(listId, "Informe o id da lista."));
  await requireListOwner(currentUser.id, list.id);
  const email = requireEmail(payload.email, "Informe o e-mail do usuario.");
  const role = normalizeRole(payload.role);
  const targetUser = await shareRepository.findUserByEmail(email);

  if (!targetUser) {
    throw new AppError(404, "Usuario nao encontrado para compartilhar.");
  }
  if (targetUser.id === currentUser.id) {
    throw new AppError(400, "Nao e possivel compartilhar a lista com voce mesmo.");
  }

  const existing = await shareRepository.findExistingShare(list.id, targetUser.id);
  if (existing) {
    throw new AppError(400, "Esta lista ja foi compartilhada com este usuario.");
  }

  let share: Awaited<ReturnType<typeof shareRepository.createShare>>;
  try {
    share = await shareRepository.createShare(list.id, targetUser.id, role);
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new AppError(409, "Esta lista ja foi compartilhada com este usuario.");
    }
    throw error;
  }
  await createNotification(targetUser.id, {
    type: "LIST_INVITE_ACCEPTED",
    title: "Lista compartilhada com voce",
    message: `${currentUser.name} compartilhou uma lista com permissao de ${role === "EDITOR" ? "editor" : "visualizador"}.`,
    metadata: { listId: list.id, role }
  });
  await recordAudit({
    userId: currentUser.id,
    action: "SHARE_CREATED",
    entityType: "SharedListAccess",
    entityId: share.id,
    listId: list.id,
    metadata: { role }
  });
  return mapShare(share);
}

export async function updateShare(listId: unknown, shareId: unknown, payload: SharePayload) {
  const currentUser = await resolveUserId(requireIdentifier(payload.userId, "Informe o userId."));
  const list = await resolveListId(requireIdentifier(listId, "Informe o id da lista."));
  await requireListOwner(currentUser.id, list.id);
  const id = requireIdentifier(shareId, "Informe o id do compartilhamento.");
  const existing = await shareRepository.findShareById(id, list.id);
  if (!existing) {
    throw new AppError(404, "Compartilhamento nao encontrado.");
  }

  const share = await shareRepository.updateShare(existing.id, normalizeRole(payload.role));
  await recordAudit({
    userId: currentUser.id,
    action: "SHARE_UPDATED",
    entityType: "SharedListAccess",
    entityId: share.id,
    listId: list.id,
    metadata: { role: share.role }
  });
  return mapShare(share);
}

export async function deleteShare(listId: unknown, shareId: unknown, userId: unknown) {
  const currentUser = await resolveUserId(requireIdentifier(userId, "Informe o userId."));
  const list = await resolveListId(requireIdentifier(listId, "Informe o id da lista."));
  await requireListOwner(currentUser.id, list.id);
  const id = requireIdentifier(shareId, "Informe o id do compartilhamento.");
  const existing = await shareRepository.findShareById(id, list.id);
  if (!existing) {
    throw new AppError(404, "Compartilhamento nao encontrado.");
  }

  await shareRepository.deleteShare(existing.id);
  await createNotification(existing.userId, {
    type: "LIST_SHARED_ACCESS_REMOVED",
    title: "Acesso removido",
    message: "Seu acesso a uma lista compartilhada foi removido.",
    metadata: { listId: list.id }
  });
  await recordAudit({
    userId: currentUser.id,
    action: "SHARE_REMOVED",
    entityType: "SharedListAccess",
    entityId: existing.id,
    listId: list.id
  });
  return { id: existing.id };
}

function mapShare(share: Awaited<ReturnType<typeof shareRepository.findSharesByList>>[number]) {
  return {
    id: share.id,
    listId: share.listId,
    userId: share.user.legacyId ?? share.userId,
    role: share.role,
    name: share.user.name,
    email: share.user.email,
    createdAt: share.createdAt,
    updatedAt: share.updatedAt
  };
}

function normalizeRole(value: unknown): ListAccessRole {
  if (value === "EDITOR" || value === "VIEWER") {
    return value;
  }
  throw new AppError(400, "Informe uma permissao valida.");
}
