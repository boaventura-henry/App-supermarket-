import type { Prisma } from "@prisma/client";
import { prisma } from "../prisma";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;

const priceHistorySelect = {
  id: true,
  legacyId: true,
  userId: true,
  listId: true,
  productId: true,
  productName: true,
  brand: true,
  quantity: true,
  price: true,
  supermarket: true,
  createdAt: true,
  user: {
    select: {
      legacyId: true
    }
  },
  list: {
    select: {
      legacyId: true
    }
  },
  product: {
    select: {
      legacyId: true
    }
  }
} as const;

export type PriceHistoryRecord = Prisma.PriceHistoryGetPayload<{ select: typeof priceHistorySelect }>;

export type PriceHistoryFilters = {
  productName?: string;
  supermarket?: string;
  brand?: string;
  monthStart?: Date;
  monthEnd?: Date;
};

export type PriceHistoryCreateInput = {
  userId: string;
  listId?: string | null;
  productId?: string | null;
  productName: string;
  brand: string;
  supermarket: string;
  quantity?: Prisma.Decimal | null;
  price: Prisma.Decimal;
  createdAt?: Date;
};

function idFilter(id: string) {
  return uuidPattern.test(id) ? [{ id }, { legacyId: id }] : [{ legacyId: id }];
}

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

export async function findListById(listId: string) {
  return prisma.shoppingList.findFirst({
    where: {
      OR: idFilter(listId)
    },
    select: {
      id: true,
      userId: true
    }
  });
}

export async function findProductById(productId: string) {
  return prisma.product.findFirst({
    where: {
      OR: idFilter(productId)
    },
    select: {
      id: true,
      userId: true,
      listId: true
    }
  });
}

export async function findAllByUser(userId: string, filters: PriceHistoryFilters = {}, limit = 500) {
  return prisma.priceHistory.findMany({
    where: {
      userId,
      ...buildFilterWhere(filters)
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: priceHistorySelect
  });
}

export async function findById(id: string, userId: string) {
  return prisma.priceHistory.findFirst({
    where: {
      userId,
      OR: idFilter(id)
    },
    select: priceHistorySelect
  });
}

export async function findByProductName(userId: string, productName: string) {
  return findAllByUser(userId, { productName });
}

export async function findBySupermarket(userId: string, supermarket: string) {
  return findAllByUser(userId, { supermarket });
}

export async function findByMonthRange(userId: string, monthStart: Date, monthEnd: Date) {
  return findAllByUser(userId, { monthStart, monthEnd });
}

export async function create(input: PriceHistoryCreateInput) {
  return prisma.priceHistory.create({
    data: {
      userId: input.userId,
      listId: input.listId ?? null,
      productId: input.productId ?? null,
      productName: input.productName,
      brand: input.brand,
      supermarket: input.supermarket,
      quantity: input.quantity ?? null,
      price: input.price,
      ...(input.createdAt ? { createdAt: input.createdAt } : {})
    },
    select: priceHistorySelect
  });
}

export async function remove(id: string, userId: string) {
  const existing = await prisma.priceHistory.findFirst({
    where: {
      userId,
      OR: idFilter(id)
    },
    select: { id: true }
  });

  if (!existing) {
    return null;
  }

  await prisma.priceHistory.delete({
    where: { id: existing.id }
  });

  return existing;
}

function buildFilterWhere(filters: PriceHistoryFilters): Prisma.PriceHistoryWhereInput {
  return {
    ...(filters.productName
      ? { productName: { contains: filters.productName, mode: "insensitive" as const } }
      : {}),
    ...(filters.supermarket
      ? { supermarket: { contains: filters.supermarket, mode: "insensitive" as const } }
      : {}),
    ...(filters.brand ? { brand: { contains: filters.brand, mode: "insensitive" as const } } : {}),
    ...(filters.monthStart || filters.monthEnd
      ? {
          createdAt: {
            ...(filters.monthStart ? { gte: filters.monthStart } : {}),
            ...(filters.monthEnd ? { lt: filters.monthEnd } : {})
          }
        }
      : {})
  };
}
