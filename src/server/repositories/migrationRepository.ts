import type { Prisma } from "@prisma/client";
import { prisma } from "../prisma";

type Client = Prisma.TransactionClient;

export function runImportTransaction<T>(callback: (client: Client) => Promise<T>) {
  return prisma.$transaction(callback, {
    maxWait: 5000,
    timeout: 20000
  });
}

export function findUser(client: Client, legacyId: string, email: string) {
  return client.user.findFirst({
    where: {
      OR: [{ legacyId }, { email }]
    },
    select: {
      id: true,
      legacyId: true,
      email: true
    }
  });
}

export function createUser(
  client: Client,
  input: {
    legacyId: string;
    name: string;
    email: string;
    passwordHash: string;
    securityAnswerHash: string;
    createdAt: Date;
  }
) {
  return client.user.create({
    data: input,
    select: {
      id: true,
      legacyId: true,
      email: true
    }
  });
}

export function attachUserLegacyId(client: Client, id: string, legacyId: string) {
  return client.user.update({
    where: { id },
    data: { legacyId },
    select: {
      id: true,
      legacyId: true,
      email: true
    }
  });
}

export function findListByLegacyId(client: Client, legacyId: string) {
  return client.shoppingList.findUnique({
    where: { legacyId },
    select: { id: true, legacyId: true, userId: true }
  });
}

export function createList(
  client: Client,
  input: {
    legacyId: string;
    userId: string;
    name: string;
    color: string;
    createdAt: Date;
    updatedAt: Date;
  }
) {
  return client.shoppingList.create({
    data: input,
    select: { id: true, legacyId: true, userId: true }
  });
}

export function findProductByLegacyId(client: Client, legacyId: string) {
  return client.product.findUnique({
    where: { legacyId },
    select: { id: true, legacyId: true, userId: true, listId: true }
  });
}

export function findProductDuplicate(
  client: Client,
  input: {
    userId: string;
    listId: string;
    name: string;
    sortOrder: number;
  }
) {
  return client.product.findFirst({
    where: input,
    select: { id: true, legacyId: true, userId: true, listId: true }
  });
}

export function createProduct(
  client: Client,
  input: {
    legacyId: string;
    userId: string;
    listId: string;
    name: string;
    brand: string;
    quantity: Prisma.Decimal | null;
    unitPrice: Prisma.Decimal | null;
    supermarket: string;
    purchased: boolean;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
  }
) {
  return client.product.create({
    data: input,
    select: { id: true, legacyId: true, userId: true, listId: true }
  });
}

export function findPriceHistoryByLegacyId(client: Client, legacyId: string) {
  return client.priceHistory.findUnique({
    where: { legacyId },
    select: { id: true, legacyId: true, userId: true }
  });
}

export function findPriceHistoryDuplicate(
  client: Client,
  input: {
    userId: string;
    productName: string;
    supermarket: string;
    price: Prisma.Decimal;
    createdAt: Date;
  }
) {
  return client.priceHistory.findFirst({
    where: {
      userId: input.userId,
      productName: input.productName,
      supermarket: input.supermarket,
      price: input.price,
      createdAt: input.createdAt
    },
    select: { id: true, legacyId: true, userId: true }
  });
}

export function createPriceHistory(
  client: Client,
  input: {
    legacyId: string;
    userId: string;
    listId: string | null;
    productId: string | null;
    productName: string;
    brand: string;
    supermarket: string;
    quantity: Prisma.Decimal | null;
    price: Prisma.Decimal;
    createdAt: Date;
  }
) {
  return client.priceHistory.create({
    data: input,
    select: { id: true, legacyId: true, userId: true }
  });
}

export function findPasskey(client: Client, userId: string, rawId: string) {
  return client.passkeyCredential.findFirst({
    where: { userId, rawId },
    select: { id: true }
  });
}

export function createPasskey(
  client: Client,
  input: {
    legacyId: string;
    userId: string;
    email: string;
    rawId: string;
    label: string;
    createdAt: Date;
    lastUsedAt: Date | null;
  }
) {
  return client.passkeyCredential.create({
    data: input,
    select: { id: true }
  });
}
