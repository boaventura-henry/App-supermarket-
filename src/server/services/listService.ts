import { AppError } from "../errors";
import * as listRepository from "../repositories/listRepository";

export type ListPayload = {
  userId?: unknown;
  name?: unknown;
  color?: unknown;
};

export async function getLists(userId: unknown) {
  const dbUser = await requireUser(userId);
  return listRepository.findAllByUser(dbUser.id);
}

export async function getList(id: unknown, userId: unknown) {
  const listId = requireString(id, "Informe o id da lista.");
  const dbUser = await requireUser(userId);
  const list = await listRepository.findById(listId, dbUser.id);

  if (!list) {
    throw new AppError(404, "Lista nao encontrada");
  }

  return list;
}

export async function createList(payload: ListPayload) {
  const dbUser = await requireUser(payload.userId);
  const name = requireString(payload.name, "Informe o nome da lista.");
  const color = normalizeColor(payload.color);

  return listRepository.create({
    userId: dbUser.id,
    name,
    color
  });
}

export async function updateList(id: unknown, payload: ListPayload) {
  const listId = requireString(id, "Informe o id da lista.");
  const dbUser = await requireUser(payload.userId);
  const data = {
    ...(payload.name !== undefined ? { name: requireString(payload.name, "Informe o nome da lista.") } : {}),
    ...(payload.color !== undefined ? { color: normalizeColor(payload.color) } : {})
  };

  if (!data.name && !data.color) {
    throw new AppError(400, "Informe ao menos um campo para atualizar.");
  }

  const list = await listRepository.update(listId, dbUser.id, data);
  if (!list) {
    throw new AppError(404, "Lista nao encontrada");
  }

  return list;
}

export async function deleteList(id: unknown, userId: unknown) {
  const listId = requireString(id, "Informe o id da lista.");
  const dbUser = await requireUser(userId);
  const removed = await listRepository.remove(listId, dbUser.id);

  if (!removed) {
    throw new AppError(404, "Lista nao encontrada");
  }

  return { id: removed.id };
}

async function requireUser(userId: unknown) {
  const id = requireString(userId, "Informe o userId.");
  const user = await listRepository.findUserByIdOrLegacyId(id);

  if (!user) {
    throw new AppError(404, "Usuario nao encontrado");
  }

  return user;
}

function requireString(value: unknown, message: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new AppError(400, message);
  }

  return value.trim();
}

function normalizeColor(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return "#6df7a7";
  }

  const color = requireString(value, "Informe uma cor valida.");
  if (!/^#[0-9a-f]{6}$/i.test(color)) {
    throw new AppError(400, "Informe uma cor hexadecimal valida.");
  }

  return color;
}
