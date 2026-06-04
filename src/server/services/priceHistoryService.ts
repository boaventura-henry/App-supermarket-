import { Prisma } from "@prisma/client";
import { AppError } from "../errors";
import * as priceHistoryRepository from "../repositories/priceHistoryRepository";
import type { PriceHistoryCreateInput, PriceHistoryRecord } from "../repositories/priceHistoryRepository";
import { optionalText, parsePageLimit, requireIdentifier, requireText } from "../validation/common";

export type PriceHistoryPayload = {
  userId?: unknown;
  listId?: unknown;
  productId?: unknown;
  productName?: unknown;
  brand?: unknown;
  supermarket?: unknown;
  quantity?: unknown;
  price?: unknown;
  createdAt?: unknown;
};

export type PriceHistoryQuery = {
  userId?: unknown;
  productName?: unknown;
  supermarket?: unknown;
  brand?: unknown;
  monthStart?: unknown;
  monthEnd?: unknown;
  limit?: unknown;
};

export async function getPriceHistory(query: PriceHistoryQuery) {
  const user = await requireUser(query.userId);
  const filters = {
    productName: optionalString(query.productName),
    supermarket: optionalString(query.supermarket),
    brand: optionalString(query.brand),
    ...parseMonthRange(query.monthStart, query.monthEnd)
  };
  const history = await priceHistoryRepository.findAllByUser(user.id, filters, parsePageLimit(query.limit, 500, 1_000));
  return history.map(mapPriceHistory);
}

export async function getPriceHistoryRecord(id: unknown, userId: unknown) {
  const historyId = requireIdentifier(id, "Informe o id do historico.");
  const user = await requireUser(userId);
  const history = await priceHistoryRepository.findById(historyId, user.id);

  if (!history) {
    throw new AppError(404, "Historico de precos nao encontrado.");
  }

  return mapPriceHistory(history);
}

export async function createPriceHistory(payload: PriceHistoryPayload) {
  const user = await requireUser(payload.userId);
  const price = parseRequiredPositiveDecimal(payload.price, "Informe um valor valido maior que zero.");
  const createdAt = parseOptionalDate(payload.createdAt);
  const listId = await resolveOptionalListId(payload.listId, user.id);
  const productId = await resolveOptionalProductId(payload.productId, user.id);
  const history = await priceHistoryRepository.create({
    userId: user.id,
    listId,
    productId,
    productName: normalizeProductName(payload.productName),
    brand: optionalText(payload.brand, "Informe uma marca valida.", 120),
    supermarket: normalizeSupermarket(payload.supermarket),
    quantity: parseOptionalDecimal(payload.quantity, "Informe uma quantidade valida ou deixe em branco.", 3),
    price,
    ...(createdAt ? { createdAt } : {})
  });

  return mapPriceHistory(history);
}

export async function deletePriceHistory(id: unknown, userId: unknown) {
  const historyId = requireIdentifier(id, "Informe o id do historico.");
  const user = await requireUser(userId);
  const removed = await priceHistoryRepository.remove(historyId, user.id);

  if (!removed) {
    throw new AppError(404, "Historico de precos nao encontrado.");
  }

  return { id: removed.id };
}

export async function createAutoPriceHistory(input: PriceHistoryCreateInput) {
  if (input.price.lessThanOrEqualTo(0)) {
    return null;
  }

  const history = await priceHistoryRepository.create({
    ...input,
    productName: input.productName.trim() || "Produto sem nome",
    brand: input.brand.trim(),
    supermarket: input.supermarket.trim() || "Sem supermercado"
  });

  return mapPriceHistory(history);
}

export function decimalToNumber(value: Prisma.Decimal | null) {
  return value === null ? null : Number(value.toString());
}

function mapPriceHistory(history: PriceHistoryRecord) {
  return {
    id: history.legacyId ?? history.id,
    remoteId: history.id,
    legacyId: history.legacyId,
    userId: history.user.legacyId ?? history.userId,
    listId: history.list?.legacyId ?? history.listId ?? undefined,
    productId: history.product?.legacyId ?? history.productId ?? undefined,
    productName: history.productName || "Produto sem nome",
    brand: history.brand ?? "",
    supermarket: history.supermarket || "Sem supermercado",
    quantity: decimalToNumber(history.quantity),
    price: decimalToNumber(history.price) ?? 0,
    timestamp: history.createdAt.getTime(),
    createdAt: history.createdAt.toISOString()
  };
}

async function requireUser(userId: unknown) {
  const id = requireIdentifier(userId, "Informe o userId.");
  const user = await priceHistoryRepository.findUserByIdOrLegacyId(id);

  if (!user) {
    throw new AppError(401, "Usuario nao encontrado.");
  }

  return user;
}

async function resolveOptionalListId(value: unknown, userId: string) {
  const id = optionalString(value);
  if (!id) {
    return null;
  }

  const list = await priceHistoryRepository.findListById(id);
  if (!list) {
    throw new AppError(404, "Lista nao encontrada.");
  }
  if (list.userId !== userId) {
    throw new AppError(403, "Somente o criador pode registrar historico nesta lista.");
  }

  return list.id;
}

async function resolveOptionalProductId(value: unknown, userId: string) {
  const id = optionalString(value);
  if (!id) {
    return null;
  }

  const product = await priceHistoryRepository.findProductById(id);
  if (!product) {
    throw new AppError(404, "Produto nao encontrado.");
  }
  if (product.userId !== userId) {
    throw new AppError(403, "Somente o criador pode registrar historico neste produto.");
  }

  return product.id;
}

function optionalString(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  return requireText(value, "Informe um filtro valido.", 160);
}

function normalizeProductName(value: unknown) {
  return value === undefined || value === null || value === ""
    ? "Produto sem nome"
    : requireText(value, "Informe um nome de produto valido.", 160);
}

function normalizeSupermarket(value: unknown) {
  const supermarket = optionalText(value, "Informe um supermercado valido.", 120);
  return supermarket || "Sem supermercado";
}

function parseRequiredPositiveDecimal(value: unknown, message: string) {
  const parsed = parseOptionalDecimal(value, message, 2);
  if (!parsed || parsed.lessThanOrEqualTo(0)) {
    throw new AppError(400, message);
  }

  return parsed;
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

function parseOptionalDate(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new AppError(400, "Informe uma data valida.");
  }

  return parsed;
}

function parseMonthRange(monthStart: unknown, monthEnd: unknown) {
  const start = parseMonth(monthStart, "monthStart");
  const end = parseMonth(monthEnd, "monthEnd");

  if (start && end && start > end) {
    throw new AppError(400, "O mes inicial deve ser anterior ao mes final.");
  }

  return {
    ...(start ? { monthStart: start } : {}),
    ...(end ? { monthEnd: nextMonth(end) } : {})
  };
}

function parseMonth(value: unknown, fieldName: string) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const match = /^(\d{4})-(\d{2})$/.exec(value.trim());
  if (!match) {
    throw new AppError(400, `Informe ${fieldName} no formato AAAA-MM.`);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) {
    throw new AppError(400, `Informe ${fieldName} no formato AAAA-MM.`);
  }

  return new Date(Date.UTC(year, month - 1, 1));
}

function nextMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
}
