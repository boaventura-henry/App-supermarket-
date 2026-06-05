import { prisma } from "../prisma";

export type ListCreateInput = {
  userId: string;
  name: string;
  color: string;
};

export type ListUpdateInput = {
  name?: string;
  color?: string;
};

export function findAllByUser(userId: string) {
  return prisma.shoppingList.findMany({
    where: { userId },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    select: listSelect
  });
}

export function findById(id: string, userId: string) {
  return prisma.shoppingList.findFirst({
    where: { id, userId },
    select: listSelect
  });
}

export function create(input: ListCreateInput) {
  return prisma.shoppingList.create({
    data: input,
    select: listSelect
  });
}

export async function update(id: string, userId: string, input: ListUpdateInput) {
  const existing = await prisma.shoppingList.findFirst({
    where: { id, userId },
    select: { id: true }
  });

  if (!existing) {
    return null;
  }

  return prisma.shoppingList.update({
    where: { id: existing.id },
    data: input,
    select: listSelect
  });
}

export async function remove(id: string, userId: string) {
  const existing = await prisma.shoppingList.findFirst({
    where: { id, userId },
    select: { id: true }
  });

  if (!existing) {
    return null;
  }

  await prisma.shoppingList.delete({
    where: { id: existing.id }
  });

  return existing;
}

const listSelect = {
  id: true,
  legacyId: true,
  userId: true,
  name: true,
  color: true,
  createdAt: true,
  updatedAt: true
} as const;
