import type { Prisma } from "@prisma/client";
import { prisma } from "../prisma";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;

const productSelect = {
  id: true,
  legacyId: true,
  userId: true,
  listId: true,
  name: true,
  brand: true,
  quantity: true,
  unitPrice: true,
  supermarket: true,
  purchased: true,
  sortOrder: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: {
      legacyId: true
    }
  },
  list: {
    select: {
      legacyId: true,
      userId: true
    }
  }
} as const;

const listSelect = {
  id: true,
  legacyId: true,
  userId: true,
  name: true,
  color: true
} as const;

export type ProductRecord = Prisma.ProductGetPayload<{ select: typeof productSelect }>;
export type ListRecord = Prisma.ShoppingListGetPayload<{ select: typeof listSelect }>;

export type ProductCreateInput = {
  userId: string;
  listId: string;
  name: string;
  brand: string | null;
  quantity: Prisma.Decimal | null;
  unitPrice: Prisma.Decimal | null;
  supermarket: string | null;
  sortOrder: number;
};

export type ProductUpdateInput = {
  name?: string;
  brand?: string | null;
  quantity?: Prisma.Decimal | null;
  unitPrice?: Prisma.Decimal | null;
  supermarket?: string | null;
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
    select: listSelect
  });
}

export function findAllByList(listId: string, userId: string) {
  return prisma.product.findMany({
    where: { listId, userId },
    orderBy: [{ purchased: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }, { id: "asc" }],
    select: productSelect
  });
}

export function findById(id: string, userId: string) {
  return prisma.product.findFirst({
    where: {
      userId,
      OR: idFilter(id)
    },
    select: productSelect
  });
}

export async function nextSortOrder(listId: string, userId: string) {
  const maxProduct = await prisma.product.aggregate({
    where: { listId, userId },
    _max: { sortOrder: true }
  });

  return (maxProduct._max.sortOrder ?? -1) + 1;
}

export function create(input: ProductCreateInput) {
  return prisma.product.create({
    data: {
      userId: input.userId,
      listId: input.listId,
      name: input.name,
      brand: input.brand,
      quantity: input.quantity,
      unitPrice: input.unitPrice,
      supermarket: input.supermarket,
      purchased: false,
      sortOrder: input.sortOrder
    },
    select: productSelect
  });
}

export async function update(id: string, userId: string, input: ProductUpdateInput) {
  const product = await findById(id, userId);
  if (!product) {
    return null;
  }

  return prisma.product.update({
    where: { id: product.id },
    data: input,
    select: productSelect
  });
}

export async function deleteProduct(id: string, userId: string) {
  const product = await findById(id, userId);
  if (!product) {
    return null;
  }

  await prisma.product.delete({
    where: { id: product.id }
  });

  return { id: product.id };
}

export async function updatePurchasedStatus(id: string, userId: string, purchased: boolean) {
  const product = await findById(id, userId);
  if (!product) {
    return null;
  }

  return prisma.product.update({
    where: { id: product.id },
    data: { purchased },
    select: productSelect
  });
}

export async function reorderProducts(listId: string, userId: string) {
  const products = await prisma.product.findMany({
    where: { listId, userId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }, { id: "asc" }],
    select: { id: true }
  });

  return prisma.$transaction(
    products.map((product, index) =>
      prisma.product.update({
        where: { id: product.id },
        data: { sortOrder: index },
        select: { id: true, sortOrder: true }
      })
    )
  );
}
