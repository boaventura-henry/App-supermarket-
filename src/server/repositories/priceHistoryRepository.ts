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
  brand: string | null;
  supermarket: string | null;
  quantity?: Prisma.Decimal | null;
  price: Prisma.Decimal;
  createdAt?: Date;
};

function idFilter(id: string) {
  return uuidPattern.test(id) ? [{ id }, { legacyId: id }] : [{ legacyId: id }];
}

export function findListById(listId: string, userId: string) {
  return prisma.shoppingList.findFirst({
    where: {
      userId,
      OR: idFilter(listId)
    },
    select: {
      id: true,
      userId: true
    }
  });
}

export function findProductById(productId: string, userId: string) {
  return prisma.product.findFirst({
    where: {
      userId,
      OR: idFilter(productId)
    },
    select: {
      id: true,
      userId: true,
      listId: true
    }
  });
}

export function findAllByUser(userId: string, filters: PriceHistoryFilters = {}) {
  return prisma.priceHistory.findMany({
    where: {
      userId,
      ...buildFilterWhere(filters)
    },
    orderBy: { createdAt: "desc" },
    select: priceHistorySelect
  });
}

export function findById(id: string, userId: string) {
  return prisma.priceHistory.findFirst({
    where: {
      userId,
      OR: idFilter(id)
    },
    select: priceHistorySelect
  });
}

export function findByProductName(userId: string, productName: string) {
  return findAllByUser(userId, { productName });
}

export function findBySupermarket(userId: string, supermarket: string) {
  return findAllByUser(userId, { supermarket });
}

export function findByMonthRange(userId: string, monthStart: Date, monthEnd: Date) {
  return findAllByUser(userId, { monthStart, monthEnd });
}

export function create(input: PriceHistoryCreateInput) {
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

export async function deleteHistory(id: string, userId: string) {
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

export { deleteHistory as delete };

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
