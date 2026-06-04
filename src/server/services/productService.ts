import { Prisma } from "@prisma/client";
import { AppError } from "../errors";
import { createAutoPriceHistory } from "./priceHistoryService";
import { requireListEditor, requireListViewer } from "../auth/listPermissions";
import * as productRepository from "../repositories/productRepository";
import type { ListRecord, ProductRecord, ProductUpdateInput } from "../repositories/productRepository";
import { optionalText, requireIdentifier, requireText } from "../validation/common";
import { recordAudit } from "./auditLogService";

export type ProductPayload = {
  userId?: unknown;
  name?: unknown;
  brand?: unknown;
  quantity?: unknown;
  unitPrice?: unknown;
  supermarket?: unknown;
  purchased?: unknown;
  expectedUpdatedAt?: unknown;
};

export async function getProducts(listId: unknown, userId: unknown) {
  const user = await requireUser(userId);
  const list = await requireList(listId);
  await requireListViewer(user.id, list.id);
  const products = await productRepository.findAllByList(list.id);
  return products.map(mapProduct);
}

export async function createProduct(listId: unknown, payload: ProductPayload) {
  const user = await requireUser(payload.userId);
  const list = await requireList(listId);
  await requireListEditor(user.id, list.id);
  const name = requireText(payload.name, "Informe a descricao do produto.", 160);
  const quantity = parseOptionalDecimal(payload.quantity, "Informe uma quantidade valida ou deixe em branco.", 3);
  const unitPrice = parseOptionalDecimal(payload.unitPrice, "Informe um valor unitario valido ou deixe em branco.", 2);
  const sortOrder = await productRepository.nextSortOrder(list.id);

  const product = await productRepository.create({
    userId: user.id,
    listId: list.id,
    name,
    brand: optionalText(payload.brand, "Informe uma marca valida.", 120),
    quantity,
    unitPrice,
    supermarket: optionalText(payload.supermarket, "Informe um supermercado valido.", 120),
    sortOrder
  });

  if (unitPrice && unitPrice.greaterThan(0)) {
    await createAutoPriceHistory({
      userId: user.id,
      listId: list.id,
      productId: product.id,
      productName: product.name,
      brand: product.brand,
      supermarket: product.supermarket,
      quantity: product.quantity,
      price: unitPrice
    });
  }

  await recordAudit({
    userId: user.id,
    action: "PRODUCT_CREATED",
    entityType: "Product",
    entityId: product.id,
    listId: product.listId,
    metadata: { name: product.name }
  });
  return mapProduct(product);
}

export async function updateProduct(id: unknown, payload: ProductPayload) {
  const productId = requireIdentifier(id, "Informe o id do produto.");
  const user = await requireUser(payload.userId);
  const current = await requireProductEditor(productId, user.id);
  validateExpectedUpdatedAt(payload.expectedUpdatedAt, current.updatedAt);
  const data: ProductUpdateInput = {};

  if (payload.name !== undefined) {
    data.name = requireText(payload.name, "Informe a descricao do produto.", 160);
  }
  if (payload.brand !== undefined) {
    data.brand = optionalText(payload.brand, "Informe uma marca valida.", 120);
  }
  if (payload.quantity !== undefined) {
    data.quantity = parseOptionalDecimal(payload.quantity, "Informe uma quantidade valida ou deixe em branco.", 3);
  }
  if (payload.unitPrice !== undefined) {
    data.unitPrice = parseOptionalDecimal(payload.unitPrice, "Informe um valor unitario valido ou deixe em branco.", 2);
  }
  if (payload.supermarket !== undefined) {
    data.supermarket = optionalText(payload.supermarket, "Informe um supermercado valido.", 120);
  }

  if (Object.keys(data).length === 0) {
    throw new AppError(400, "Informe ao menos um campo para atualizar.");
  }

  const previousUnitPrice = current.unitPrice;
  const updated = await productRepository.update(current.id, data);

  if (
    data.unitPrice &&
    data.unitPrice.greaterThan(0) &&
    (!previousUnitPrice || !data.unitPrice.equals(previousUnitPrice))
  ) {
    await createAutoPriceHistory({
      userId: user.id,
      listId: updated.listId,
      productId: updated.id,
      productName: updated.name,
      brand: updated.brand,
      supermarket: updated.supermarket,
      quantity: updated.quantity,
      price: data.unitPrice
    });
  }

  await recordAudit({
    userId: user.id,
    action: "PRODUCT_UPDATED",
    entityType: "Product",
    entityId: updated.id,
    listId: updated.listId,
    metadata: { fields: Object.keys(data) }
  });
  return mapProduct(updated);
}

export async function deleteProduct(id: unknown, userId: unknown) {
  const productId = requireIdentifier(id, "Informe o id do produto.");
  const user = await requireUser(userId);
  const product = await requireProductEditor(productId, user.id);
  await productRepository.remove(product.id);
  await recordAudit({
    userId: user.id,
    action: "PRODUCT_DELETED",
    entityType: "Product",
    entityId: product.id,
    listId: product.listId,
    metadata: { name: product.name }
  });
  return { id: product.id };
}

export async function updatePurchasedStatus(id: unknown, payload: ProductPayload) {
  const productId = requireIdentifier(id, "Informe o id do produto.");
  const user = await requireUser(payload.userId);
  const product = await requireProductEditor(productId, user.id);
  const purchased = requireBoolean(payload.purchased, "Informe o status de comprado.");
  const updated = await productRepository.updatePurchasedStatus(product.id, purchased);
  await recordAudit({
    userId: user.id,
    action: purchased ? "PRODUCT_PURCHASED" : "PRODUCT_UNPURCHASED",
    entityType: "Product",
    entityId: updated.id,
    listId: updated.listId
  });
  return mapProduct(updated);
}

async function requireUser(userId: unknown) {
  const id = requireIdentifier(userId, "Informe o userId.");
  const user = await productRepository.findUserByIdOrLegacyId(id);

  if (!user) {
    throw new AppError(401, "Usuario nao encontrado.");
  }

  return user;
}

async function requireList(listId: unknown): Promise<ListRecord> {
  const id = requireIdentifier(listId, "Informe o id da lista.");
  const list = await productRepository.findListById(id);

  if (!list) {
    throw new AppError(404, "Lista nao encontrada.");
  }

  return list;
}

async function requireProductEditor(productId: string, userId: string) {
  const product = await productRepository.findById(productId);
  if (!product) {
    throw new AppError(404, "Produto nao encontrado.");
  }
  await requireListEditor(userId, product.listId);

  return product;
}

function requireBoolean(value: unknown, message: string) {
  if (typeof value !== "boolean") {
    throw new AppError(400, message);
  }

  return value;
}

function parseOptionalDecimal(value: unknown, message: string, decimalPlaces: number) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const rawValue = typeof value === "number" ? String(value) : typeof value === "string" ? value.trim() : "";
  if (!rawValue) {
    return null;
  }

  const normalized = rawValue.includes(",") ? rawValue.replace(/\./g, "").replace(",", ".") : rawValue;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 999_999_999) {
    throw new AppError(400, message);
  }

  return new Prisma.Decimal(parsed.toFixed(decimalPlaces));
}

function validateExpectedUpdatedAt(value: unknown, currentUpdatedAt: Date) {
  if (value === undefined || value === null || value === "") {
    return;
  }
  if (typeof value !== "string") {
    throw new AppError(400, "Informe a versao esperada do produto.");
  }
  const expected = Date.parse(value);
  if (!Number.isFinite(expected) || expected !== currentUpdatedAt.getTime()) {
    throw new AppError(409, "Este item foi alterado por outro usuario. Recarregue a linha antes de salvar.");
  }
}

function mapProduct(product: ProductRecord) {
  return {
    id: product.legacyId ?? product.id,
    remoteId: product.id,
    legacyId: product.legacyId,
    userId: product.user.legacyId ?? product.userId,
    listId: product.list.legacyId ?? product.listId,
    name: product.name,
    brand: product.brand,
    quantity: decimalToNumber(product.quantity),
    unitPrice: decimalToNumber(product.unitPrice),
    supermarket: product.supermarket,
    purchased: product.purchased,
    isBought: product.purchased,
    sortOrder: product.sortOrder,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString()
  };
}

function decimalToNumber(value: Prisma.Decimal | null) {
  return value === null ? null : Number(value.toString());
}
