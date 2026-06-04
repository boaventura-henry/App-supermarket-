import { prisma } from "../prisma";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function idFilter(id: string) {
  return uuidPattern.test(id) ? [{ id }, { legacyId: id }] : [{ legacyId: id }];
}

export type ListCreateInput = {
  userId: string;
  name: string;
  color: string;
};

export type ListUpdateInput = {
  name?: string;
  color?: string;
};

export async function findUserByIdOrLegacyId(userId: string) {
  return prisma.user.findFirst({
    where: {
      OR: idFilter(userId)
    },
    select: {
      id: true,
      legacyId: true,
      name: true,
      email: true
    }
  });
}

export async function findAllByUser(userId: string) {
  return prisma.shoppingList.findMany({
    where: {
      OR: [{ userId }, { sharedAccess: { some: { userId } } }]
    },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    take: 500,
    select: listSelect()
  });
}

export async function findAccessibleById(id: string, userId: string) {
  return prisma.shoppingList.findFirst({
    where: {
      AND: [
        { OR: idFilter(id) },
        {
          OR: [{ userId }, { sharedAccess: { some: { userId } } }]
        }
      ]
    },
    select: listSelect()
  });
}

export async function findOwnedById(id: string, userId: string) {
  return prisma.shoppingList.findFirst({
    where: {
      userId,
      OR: idFilter(id)
    },
    select: listSelect()
  });
}

export async function create(input: ListCreateInput) {
  return prisma.shoppingList.create({
    data: {
      userId: input.userId,
      name: input.name,
      color: input.color
    },
    select: listSelect()
  });
}

export async function update(id: string, userId: string, input: ListUpdateInput) {
  const existing = await prisma.shoppingList.findFirst({
    where: {
      userId,
      OR: idFilter(id)
    },
    select: { id: true, name: true }
  });

  if (!existing) {
    return null;
  }

  return prisma.shoppingList.update({
    where: { id: existing.id },
    data: input,
    select: listSelect()
  });
}

export async function remove(id: string, userId: string) {
  const existing = await prisma.shoppingList.findFirst({
    where: {
      userId,
      OR: idFilter(id)
    },
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

function listSelect() {
  return {
    id: true,
    legacyId: true,
    userId: true,
    name: true,
    color: true,
    createdAt: true,
    updatedAt: true,
    user: {
      select: {
        name: true,
        email: true,
        legacyId: true
      }
    },
    sharedAccess: {
      select: {
        userId: true,
        role: true
      }
    }
  } as const;
}
