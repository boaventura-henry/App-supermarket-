import { Prisma } from "@prisma/client";
import { AppError } from "../errors";
import { createAutoPriceHistory } from "./priceHistoryService";
import * as productRepository from "../repositories/productRepository";
import * as profileRepository from "../repositories/profileRepository";
import type { LocalIdentity } from "../repositories/profileRepository";
import type { ListRecord, ProductRecord, ProductUpdateInput } from "../repositories/productRepository";

export type ProductPayload = {
  name?: unknown;
  brand?: unknown;
  quantity?: unknown;
  unitPrice?: unknown;
  supermarket?: unknown;
  purchased?: unknown;
};

export async function getProducts(identity: LocalIdentity, listId: unknown) {
  const profile = await resolveProfile(identity);
  const list = await requireListOwner(listId, profile.id);
  const products = await productRepository.findAllByList(list.id, profile.id);
  return products.map(mapProduct);
}

export async function createProduct(identity: LocalIdentity, listId: unknown, payload: ProductPayload) {
  const profile = await resolveProfile(identity);
  const list = await requireListOwner(listId, profile.id);
  const name = requireText(payload.name, "Informe a descricao do produto.", 180);
  const quantity = parseOptionalDecimal(payload.quantity, "Informe uma quantidade valida ou deixe em branco.", 3);
  const unitPrice = parseOptionalDecimal(payload.unitPrice, "Informe um valor unitario valido ou deixe em branco.", 2);
  const sortOrder = await productRepository.nextSortOrder(list.id, profile.id);

  const product = await productRepository.create({
    userId: profile.id,
    listId: list.id,
    name,
    brand: normalizeOptionalText(payload.brand, 120),
    quantity,
    unitPrice,
    supermarket: normalizeOptionalText(payload.supermarket, 160),
    sortOrder
  });

  if (unitPrice && unitPrice.greaterThan(0)) {
    await createAutoPriceHistory({
      userId: profile.id,
      listId: list.id,
      productId: product.id,
      productName: product.name,
      brand: product.brand ?? "",
      supermarket: product.supermarket ?? "",
      quantity: product.quantity,
      price: unitPrice
    });
  }

  return mapProduct(product);
}

export async function updateProduct(identity: LocalIdentity, id: unknown, payload: ProductPayload) {
  const profile = await resolveProfile(identity);
  const productId = requireText(id, "Informe o id do produto.", 160);
  const current = await requireProductOwner(productId, profile.id);
  const data: ProductUpdateInput = {};

  if (payload.name !== undefined) {
    data.name = requireText(payload.name, "Informe a descricao do produto.", 180);
  }
  if (payload.brand !== undefined) {
    data.brand = normalizeOptionalText(payload.brand, 120);
  }
  if (payload.quantity !== undefined) {
    data.quantity = parseOptionalDecimal(payload.quantity, "Informe uma quantidade valida ou deixe em branco.", 3);
  }
  if (payload.unitPrice !== undefined) {
    data.unitPrice = parseOptionalDecimal(payload.unitPrice, "Informe um valor unitario valido ou deixe em branco.", 2);
  }
  if (payload.supermarket !== undefined) {
    data.supermarket = normalizeOptionalText(payload.supermarket, 160);
  }

  if (Object.keys(data).length === 0) {
    throw new AppError(400, "Informe ao menos um campo para atualizar.");
  }

  const previousUnitPrice = current.unitPrice;
  const updated = await productRepository.update(current.id, profile.id, data);
  if (!updated) {
    throw new AppError(404, "Produto nao encontrado.");
  }

  if (
    data.unitPrice &&
    data.unitPrice.greaterThan(0) &&
    (!previousUnitPrice || !data.unitPrice.equals(previousUnitPrice))
  ) {
    await createAutoPriceHistory({
      userId: profile.id,
      listId: updated.listId,
      productId: updated.id,
      productName: updated.name,
      brand: updated.brand ?? "",
      supermarket: updated.supermarket ?? "",
      quantity: updated.quantity,
      price: data.unitPrice
    });
  }

  return mapProduct(updated);
}

export async function deleteProduct(identity: LocalIdentity, id: unknown) {
  const profile = await resolveProfile(identity);
  const productId = requireText(id, "Informe o id do produto.", 160);
  const removed = await productRepository.deleteProduct(productId, profile.id);

  if (!removed) {
    throw new AppError(404, "Produto nao encontrado.");
  }

  return removed;
}

export async function updatePurchasedStatus(identity: LocalIdentity, id: unknown, payload: ProductPayload) {
  const profile = await resolveProfile(identity);
  const productId = requireText(id, "Informe o id do produto.", 160);
  await requireProductOwner(productId, profile.id);
  const purchased = requireBoolean(payload.purchased, "Informe o status de comprado.");
  const updated = await productRepository.updatePurchasedStatus(productId, profile.id, purchased);

  if (!updated) {
    throw new AppError(404, "Produto nao encontrado.");
  }

  return mapProduct(updated);
}

export async function reorderProducts(identity: LocalIdentity, listId: unknown) {
  const profile = await resolveProfile(identity);
  const list = await requireListOwner(listId, profile.id);
  return productRepository.reorderProducts(list.id, profile.id);
}

async function resolveProfile(identity: LocalIdentity) {
  return profileRepository.ensureProfile(normalizeIdentity(identity));
}

async function requireListOwner(listId: unknown, userId: string): Promise<ListRecord> {
  const id = requireText(listId, "Informe o id da lista.", 160);
  const list = await productRepository.findListById(id, userId);

  if (!list) {
    throw new AppError(404, "Lista nao encontrada.");
  }

  return list;
}

async function requireProductOwner(productId: string, userId: string) {
  const product = await productRepository.findById(productId, userId);
  if (!product) {
    throw new AppError(404, "Produto nao encontrado.");
  }
  if (product.list.userId !== userId) {
    throw new AppError(403, "Somente o criador da lista pode alterar.");
  }

  return product;
}

function normalizeIdentity(identity: LocalIdentity) {
  const legacyId = requireText(identity.legacyId, "Identidade local ausente.", 160);
  const name = requireText(identity.name, "Nome do usuario ausente.", 160);
  const email = requireText(identity.email, "E-mail do usuario ausente.", 320).toLowerCase();

  if (!email.includes("@")) {
    throw new AppError(400, "E-mail do usuario invalido.");
  }

  return { legacyId, name, email };
}

function requireText(value: unknown, message: string, maxLength: number) {
  if (typeof value !== "string" || !value.trim()) {
    throw new AppError(400, message);
  }

  const normalized = value.trim();
  if (normalized.length > maxLength) {
    throw new AppError(400, `${message} Limite de ${maxLength} caracteres.`);
  }
  return normalized;
}

function normalizeOptionalText(value: unknown, maxLength: number) {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  if (typeof value !== "string") {
    throw new AppError(400, "Informe um texto valido.");
  }

  const normalized = value.trim();
  if (!normalized) {
    return null;
  }
  if (normalized.length > maxLength) {
    throw new AppError(400, `Informe um texto com ate ${maxLength} caracteres.`);
  }
  return normalized;
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
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new AppError(400, message);
  }

  return new Prisma.Decimal(parsed.toFixed(decimalPlaces));
}

function mapProduct(product: ProductRecord) {
  return {
    id: product.legacyId ?? product.id,
    remoteId: product.id,
    legacyId: product.legacyId,
    userId: product.user.legacyId ?? product.userId,
    listId: product.list.legacyId ?? product.listId,
    name: product.name,
    brand: product.brand ?? "",
    quantity: decimalToNumber(product.quantity),
    unitPrice: decimalToNumber(product.unitPrice),
    supermarket: product.supermarket ?? "",
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
