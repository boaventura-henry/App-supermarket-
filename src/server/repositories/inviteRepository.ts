import type { ListAccessRole, ListInviteStatus, Prisma } from "@prisma/client";
import { prisma } from "../prisma";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;

function idFilter(id: string) {
  return uuidPattern.test(id) ? [{ id }, { legacyId: id }] : [{ legacyId: id }];
}

const inviteSelect = {
  id: true,
  listId: true,
  invitedEmail: true,
  invitedUserId: true,
  invitedByUserId: true,
  role: true,
  status: true,
  token: true,
  expiresAt: true,
  createdAt: true,
  updatedAt: true,
  list: {
    select: {
      id: true,
      legacyId: true,
      name: true,
      color: true,
      userId: true,
      user: {
        select: {
          name: true,
          email: true,
          legacyId: true
        }
      }
    }
  },
  invitedUser: {
    select: {
      id: true,
      legacyId: true,
      name: true,
      email: true
    }
  },
  invitedByUser: {
    select: {
      id: true,
      legacyId: true,
      name: true,
      email: true
    }
  }
} as const;

export type InviteRecord = Prisma.ListInviteGetPayload<{ select: typeof inviteSelect }>;

export type InviteCreateInput = {
  listId: string;
  invitedEmail: string;
  invitedUserId: string | null;
  invitedByUserId: string;
  role: ListAccessRole;
  token?: string;
  expiresAt?: Date | null;
};

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
    select: { id: true, legacyId: true, name: true, email: true }
  });
}

export async function findListById(id: string) {
  return prisma.shoppingList.findFirst({
    where: { OR: idFilter(id) },
    select: {
      id: true,
      legacyId: true,
      userId: true,
      name: true,
      user: {
        select: {
          name: true,
          email: true,
          legacyId: true
        }
      }
    }
  });
}

export async function findAccess(listId: string, userId: string) {
  return prisma.sharedListAccess.findUnique({
    where: { listId_userId: { listId, userId } },
    select: { id: true, role: true }
  });
}

export async function findPendingByEmail(listId: string, invitedEmail: string) {
  return prisma.listInvite.findFirst({
    where: { listId, invitedEmail, status: "PENDING" },
    select: inviteSelect
  });
}

export async function findAllForList(listId: string) {
  return prisma.listInvite.findMany({
    where: { listId },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: inviteSelect
  });
}

export async function findPendingForUser(userId: string, email: string) {
  return prisma.listInvite.findMany({
    where: {
      status: "PENDING",
      OR: [{ invitedUserId: userId }, { invitedEmail: email }]
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: inviteSelect
  });
}

export async function findById(id: string) {
  return prisma.listInvite.findFirst({
    where: { id },
    select: inviteSelect
  });
}

export async function create(input: InviteCreateInput) {
  return prisma.listInvite.create({
    data: input,
    select: inviteSelect
  });
}

export async function updateStatus(id: string, status: ListInviteStatus, invitedUserId?: string | null) {
  return prisma.listInvite.update({
    where: { id },
    data: {
      status,
      ...(invitedUserId !== undefined ? { invitedUserId } : {})
    },
    select: inviteSelect
  });
}

export async function acceptInvite(inviteId: string, userId: string, role: ListAccessRole) {
  const invite = await prisma.listInvite.findUnique({
    where: { id: inviteId },
    select: { id: true, listId: true }
  });

  if (!invite) {
    return null;
  }

  return prisma.$transaction(async (client) => {
    await client.sharedListAccess.upsert({
      where: { listId_userId: { listId: invite.listId, userId } },
      update: { role },
      create: { listId: invite.listId, userId, role }
    });

    return client.listInvite.update({
      where: { id: invite.id },
      data: { status: "ACCEPTED", invitedUserId: userId },
      select: inviteSelect
    });
  });
}
