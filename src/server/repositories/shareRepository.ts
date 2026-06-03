import type { ListAccessRole } from "@prisma/client";
import { prisma } from "../prisma";

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
    select: { id: true, legacyId: true, name: true, email: true }
  });
}

export async function findSharesByList(listId: string) {
  return prisma.sharedListAccess.findMany({
    where: { listId },
    orderBy: { createdAt: "asc" },
    select: shareSelect()
  });
}

export async function findShareById(id: string, listId: string) {
  return prisma.sharedListAccess.findFirst({
    where: { id, listId },
    select: shareSelect()
  });
}

export async function findExistingShare(listId: string, userId: string) {
  return prisma.sharedListAccess.findUnique({
    where: {
      listId_userId: { listId, userId }
    },
    select: shareSelect()
  });
}

export async function createShare(listId: string, userId: string, role: ListAccessRole) {
  return prisma.sharedListAccess.create({
    data: { listId, userId, role },
    select: shareSelect()
  });
}

export async function updateShare(id: string, role: ListAccessRole) {
  return prisma.sharedListAccess.update({
    where: { id },
    data: { role },
    select: shareSelect()
  });
}

export async function deleteShare(id: string) {
  return prisma.sharedListAccess.delete({
    where: { id },
    select: { id: true }
  });
}

function shareSelect() {
  return {
    id: true,
    listId: true,
    userId: true,
    role: true,
    createdAt: true,
    updatedAt: true,
    user: {
      select: {
        legacyId: true,
        name: true,
        email: true
      }
    }
  } as const;
}
