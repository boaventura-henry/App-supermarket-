import { AppError } from "../errors";
import * as listRepository from "../repositories/listRepository";
import { requireListOwner } from "../auth/listPermissions";
import { requireIdentifier, requireText } from "../validation/common";
import { recordAudit } from "./auditLogService";

export type ListPayload = {
  userId?: unknown;
  name?: unknown;
  color?: unknown;
};

export async function getLists(userId: unknown) {
  const dbUser = await requireUser(userId);
  const lists = await listRepository.findAllByUser(dbUser.id);
  return lists.map((list) => mapList(list, dbUser.id));
}

export async function getList(id: unknown, userId: unknown) {
  const listId = requireIdentifier(id, "Informe o id da lista.");
  const dbUser = await requireUser(userId);
  const list = await listRepository.findAccessibleById(listId, dbUser.id);

  if (!list) {
    throw new AppError(404, "Lista nao encontrada");
  }

  return mapList(list, dbUser.id);
}

export async function createList(payload: ListPayload) {
  const dbUser = await requireUser(payload.userId);
  const name = requireText(payload.name, "Informe o nome da lista.", 120);
  const color = normalizeColor(payload.color);

  const list = await listRepository.create({
    userId: dbUser.id,
    name,
    color
  });
  await recordAudit({
    userId: dbUser.id,
    action: "LIST_CREATED",
    entityType: "ShoppingList",
    entityId: list.id,
    listId: list.id,
    metadata: { name: list.name, color: list.color }
  });
  return mapList(list, dbUser.id);
}

export async function updateList(id: unknown, payload: ListPayload) {
  const listId = requireIdentifier(id, "Informe o id da lista.");
  const dbUser = await requireUser(payload.userId);
  await requireListOwner(dbUser.id, listId);
  const data = {
    ...(payload.name !== undefined ? { name: requireText(payload.name, "Informe o nome da lista.", 120) } : {}),
    ...(payload.color !== undefined ? { color: normalizeColor(payload.color) } : {})
  };

  if (!data.name && !data.color) {
    throw new AppError(400, "Informe ao menos um campo para atualizar.");
  }

  const list = await listRepository.update(listId, dbUser.id, data);
  if (!list) {
    throw new AppError(404, "Lista nao encontrada");
  }

  await recordAudit({
    userId: dbUser.id,
    action: "LIST_UPDATED",
    entityType: "ShoppingList",
    entityId: list.id,
    listId: list.id,
    metadata: { fields: Object.keys(data) }
  });
  return mapList(list, dbUser.id);
}

export async function deleteList(id: unknown, userId: unknown) {
  const listId = requireIdentifier(id, "Informe o id da lista.");
  const dbUser = await requireUser(userId);
  await requireListOwner(dbUser.id, listId);
  const removed = await listRepository.remove(listId, dbUser.id);

  if (!removed) {
    throw new AppError(404, "Lista nao encontrada");
  }

  await recordAudit({
    userId: dbUser.id,
    action: "LIST_DELETED",
    entityType: "ShoppingList",
    entityId: removed.id,
    metadata: { name: removed.name }
  });
  return { id: removed.id };
}

function mapList(list: Awaited<ReturnType<typeof listRepository.findAllByUser>>[number], currentUserId: string) {
  const shared = list.sharedAccess.find((access) => access.userId === currentUserId);
  const accessRole = list.userId === currentUserId ? "OWNER" : shared?.role ?? "VIEWER";
  return {
    id: list.legacyId ?? list.id,
    remoteId: list.id,
    legacyId: list.legacyId,
    userId: list.user.legacyId ?? list.userId,
    name: list.name,
    color: list.color,
    createdAt: list.createdAt,
    updatedAt: list.updatedAt,
    accessRole,
    ownerName: list.user.name,
    ownerEmail: list.user.email
  };
}

async function requireUser(userId: unknown) {
  const id = requireIdentifier(userId, "Informe o userId.");
  const user = await listRepository.findUserByIdOrLegacyId(id);

  if (!user) {
    throw new AppError(404, "Usuario nao encontrado");
  }

  return user;
}

function normalizeColor(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return "#6df7a7";
  }

  const color = requireText(value, "Informe uma cor valida.", 7);
  if (!/^#[0-9a-f]{6}$/i.test(color)) {
    throw new AppError(400, "Informe uma cor hexadecimal valida.");
  }

  return color;
}
