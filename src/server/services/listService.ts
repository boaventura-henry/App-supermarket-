import { AppError } from "../errors";
import * as listRepository from "../repositories/listRepository";
import * as profileRepository from "../repositories/profileRepository";
import type { LocalIdentity } from "../repositories/profileRepository";

export type ListPayload = {
  name?: unknown;
  color?: unknown;
};

export async function getLists(identity: LocalIdentity) {
  const profile = await profileRepository.ensureProfile(normalizeIdentity(identity));
  return listRepository.findAllByUser(profile.id);
}

export async function getList(identity: LocalIdentity, id: unknown) {
  const profile = await profileRepository.ensureProfile(normalizeIdentity(identity));
  const list = await listRepository.findById(requireId(id), profile.id);

  if (!list) {
    throw new AppError(404, "Lista nao encontrada");
  }

  return list;
}

export async function createList(identity: LocalIdentity, payload: ListPayload) {
  const profile = await profileRepository.ensureProfile(normalizeIdentity(identity));
  return listRepository.create({
    userId: profile.id,
    name: requireName(payload.name),
    color: normalizeColor(payload.color)
  });
}

export async function updateList(identity: LocalIdentity, id: unknown, payload: ListPayload) {
  const profile = await profileRepository.ensureProfile(normalizeIdentity(identity));
  const data = {
    ...(payload.name !== undefined ? { name: requireName(payload.name) } : {}),
    ...(payload.color !== undefined ? { color: normalizeColor(payload.color) } : {})
  };

  if (Object.keys(data).length === 0) {
    throw new AppError(400, "Informe ao menos um campo para atualizar.");
  }

  const list = await listRepository.update(requireId(id), profile.id, data);
  if (!list) {
    throw new AppError(404, "Lista nao encontrada");
  }

  return list;
}

export async function deleteList(identity: LocalIdentity, id: unknown) {
  const profile = await profileRepository.ensureProfile(normalizeIdentity(identity));
  const removed = await listRepository.remove(requireId(id), profile.id);

  if (!removed) {
    throw new AppError(404, "Lista nao encontrada");
  }

  return { id: removed.id };
}

function normalizeIdentity(identity: LocalIdentity) {
  const legacyId = requireText(identity.legacyId, "Identidade local ausente.", 160);
  const name = requireText(identity.name, "Nome do usuario ausente.", 160);
  const email = requireText(identity.email, "E-mail do usuario ausente.", 320).toLowerCase();

  if (!email.includes("@")) {
    throw new AppError(400, "E-mail do usuario invalido.");
  }

  return { legacyId, name, email };
}

function requireId(value: unknown) {
  return requireText(value, "Informe o id da lista.", 160);
}

function requireName(value: unknown) {
  return requireText(value, "Informe o nome da lista.", 160);
}

function requireText(value: unknown, message: string, maxLength: number) {
  if (typeof value !== "string" || !value.trim()) {
    throw new AppError(400, message);
  }

  const normalized = value.trim();
  if (normalized.length > maxLength) {
    throw new AppError(400, `${message} Limite de ${maxLength} caracteres.`);
  }
  return normalized;
}

function normalizeColor(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return "#6df7a7";
  }

  const color = requireText(value, "Informe uma cor valida.", 7);
  if (!/^#[0-9a-f]{6}$/i.test(color)) {
    throw new AppError(400, "Informe uma cor hexadecimal valida.");
  }

  return color.toLowerCase();
}
