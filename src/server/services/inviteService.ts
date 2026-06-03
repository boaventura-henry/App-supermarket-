import type { ListAccessRole } from "@prisma/client";
import { requireListOwner, resolveUserId } from "../auth/listPermissions";
import { AppError } from "../errors";
import * as inviteRepository from "../repositories/inviteRepository";
import type { InviteRecord } from "../repositories/inviteRepository";
import { createNotification } from "./notificationService";

export type InvitePayload = {
  userId?: unknown;
  email?: unknown;
  role?: unknown;
};

export async function getMyInvites(userId: unknown) {
  const user = await resolveUserId(requireString(userId, "Informe o userId."));
  const invites = await inviteRepository.findPendingForUser(user.id, user.email.toLowerCase());
  return invites.map(mapInvite);
}

export async function getListInvites(listId: unknown, userId: unknown) {
  const currentUser = await resolveUserId(requireString(userId, "Informe o userId."));
  const list = await requireOwnedList(listId, currentUser.id);
  const invites = await inviteRepository.findAllForList(list.id);
  return invites.map(mapInvite);
}

export async function createInvite(listId: unknown, payload: InvitePayload) {
  const currentUser = await resolveUserId(requireString(payload.userId, "Informe o userId."));
  const list = await requireOwnedList(listId, currentUser.id);
  const invitedEmail = requireEmail(payload.email);
  const role = normalizeRole(payload.role);
  const targetUser = await inviteRepository.findUserByEmail(invitedEmail);

  if (invitedEmail === currentUser.email.toLowerCase() || targetUser?.id === currentUser.id) {
    throw new AppError(400, "Nao e possivel convidar voce mesmo.");
  }
  if (targetUser && targetUser.id === list.userId) {
    throw new AppError(400, "O dono da lista ja tem acesso.");
  }
  if (targetUser) {
    const access = await inviteRepository.findAccess(list.id, targetUser.id);
    if (access) {
      throw new AppError(400, "Este usuario ja tem acesso a lista.");
    }
  }

  const pending = await inviteRepository.findPendingByEmail(list.id, invitedEmail);
  if (pending) {
    throw new AppError(400, "Ja existe um convite pendente para este e-mail.");
  }

  const invite = await inviteRepository.create({
    listId: list.id,
    invitedEmail,
    invitedUserId: targetUser?.id ?? null,
    invitedByUserId: currentUser.id,
    role,
    token: createInviteToken(),
    expiresAt: null
  });

  if (targetUser) {
    await createNotification(targetUser.id, {
      type: "LIST_INVITE_RECEIVED",
      title: "Novo convite de lista",
      message: `${currentUser.name} convidou voce para acessar "${list.name}" como ${role === "EDITOR" ? "editor" : "visualizador"}.`,
      metadata: { inviteId: invite.id, listId: list.legacyId ?? list.id, role }
    });
  }

  return mapInvite(invite);
}

export async function acceptInvite(inviteId: unknown, userId: unknown) {
  const currentUser = await resolveUserId(requireString(userId, "Informe o userId."));
  const invite = await requirePendingInviteForUser(inviteId, currentUser.id, currentUser.email);
  const accepted = await inviteRepository.acceptInvite(invite.id, currentUser.id, invite.role);

  if (!accepted) {
    throw new AppError(404, "Convite nao encontrado.");
  }

  await createNotification(invite.invitedByUserId, {
    type: "LIST_INVITE_ACCEPTED",
    title: "Convite aceito",
    message: `${currentUser.name} aceitou o convite para "${invite.list.name}".`,
    metadata: { inviteId: invite.id, listId: invite.list.legacyId ?? invite.listId }
  });

  return mapInvite(accepted);
}

export async function declineInvite(inviteId: unknown, userId: unknown) {
  const currentUser = await resolveUserId(requireString(userId, "Informe o userId."));
  const invite = await requirePendingInviteForUser(inviteId, currentUser.id, currentUser.email);
  const declined = await inviteRepository.updateStatus(invite.id, "DECLINED", currentUser.id);

  await createNotification(invite.invitedByUserId, {
    type: "LIST_INVITE_DECLINED",
    title: "Convite recusado",
    message: `${currentUser.name} recusou o convite para "${invite.list.name}".`,
    metadata: { inviteId: invite.id, listId: invite.list.legacyId ?? invite.listId }
  });

  return mapInvite(declined);
}

export async function cancelInvite(inviteId: unknown, userId: unknown) {
  const currentUser = await resolveUserId(requireString(userId, "Informe o userId."));
  const invite = await requireInvite(inviteId);
  await requireListOwner(currentUser.id, invite.listId);

  if (invite.status !== "PENDING") {
    throw new AppError(400, "Somente convites pendentes podem ser cancelados.");
  }

  const canceled = await inviteRepository.updateStatus(invite.id, "CANCELED");
  if (invite.invitedUserId) {
    await createNotification(invite.invitedUserId, {
      type: "LIST_SHARED_ACCESS_REMOVED",
      title: "Convite cancelado",
      message: `${currentUser.name} cancelou o convite para "${invite.list.name}".`,
      metadata: { inviteId: invite.id, listId: invite.list.legacyId ?? invite.listId }
    });
  }

  return mapInvite(canceled);
}

async function requireOwnedList(listId: unknown, userId: string) {
  const id = requireString(listId, "Informe o id da lista.");
  const list = await inviteRepository.findListById(id);
  if (!list) {
    throw new AppError(404, "Lista nao encontrada.");
  }
  await requireListOwner(userId, list.id);
  return list;
}

async function requireInvite(inviteId: unknown) {
  const id = requireString(inviteId, "Informe o id do convite.");
  const invite = await inviteRepository.findById(id);
  if (!invite) {
    throw new AppError(404, "Convite nao encontrado.");
  }
  return invite;
}

async function requirePendingInviteForUser(inviteId: unknown, userId: string, email: string) {
  const invite = await requireInvite(inviteId);
  if (invite.status !== "PENDING") {
    throw new AppError(400, "Este convite nao esta pendente.");
  }
  const normalizedEmail = email.toLowerCase();
  if (invite.invitedUserId !== userId && invite.invitedEmail !== normalizedEmail) {
    throw new AppError(403, "Voce nao tem permissao para responder este convite.");
  }
  if (invite.expiresAt && invite.expiresAt.getTime() < Date.now()) {
    const expired = await inviteRepository.updateStatus(invite.id, "EXPIRED");
    throw new AppError(400, `Convite expirado em ${expired.expiresAt?.toISOString() ?? "data desconhecida"}.`);
  }
  return invite;
}

function mapInvite(invite: InviteRecord) {
  return {
    id: invite.id,
    listId: invite.list.legacyId ?? invite.listId,
    remoteListId: invite.listId,
    listName: invite.list.name,
    listColor: invite.list.color,
    ownerName: invite.list.user.name,
    ownerEmail: invite.list.user.email,
    invitedEmail: invite.invitedEmail,
    invitedUserId: invite.invitedUser?.legacyId ?? invite.invitedUserId,
    invitedByUserId: invite.invitedByUser.legacyId ?? invite.invitedByUserId,
    invitedByName: invite.invitedByUser.name,
    invitedByEmail: invite.invitedByUser.email,
    role: invite.role,
    status: invite.status,
    expiresAt: invite.expiresAt?.toISOString() ?? null,
    createdAt: invite.createdAt.toISOString(),
    updatedAt: invite.updatedAt.toISOString()
  };
}

function normalizeRole(value: unknown): ListAccessRole {
  if (value === "EDITOR" || value === "VIEWER") {
    return value;
  }
  throw new AppError(400, "Informe uma permissao valida.");
}

function requireEmail(value: unknown) {
  const email = requireString(value, "Informe o e-mail do usuario.").toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new AppError(400, "Informe um e-mail valido.");
  }
  return email;
}

function requireString(value: unknown, message: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new AppError(400, message);
  }
  return value.trim();
}

function createInviteToken() {
  return `inv_${Date.now()}_${Math.random().toString(36).slice(2, 14)}`;
}
