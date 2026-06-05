import { Prisma } from "@prisma/client";
import { AppError } from "../errors";
import * as priceHistoryRepository from "../repositories/priceHistoryRepository";
import * as profileRepository from "../repositories/profileRepository";
import type { LocalIdentity } from "../repositories/profileRepository";
import type { PriceHistoryCreateInput, PriceHistoryRecord } from "../repositories/priceHistoryRepository";

export type PriceHistoryPayload = {
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
  productName?: unknown;
  supermarket?: unknown;
  brand?: unknown;
  monthStart?: unknown;
  monthEnd?: unknown;
};

export async function getPriceHistory(identity: LocalIdentity, query: PriceHistoryQuery) {
  const profile = await resolveProfile(identity);
  const filters = {
    productName: optionalText(query.productName),
    supermarket: optionalText(query.supermarket),
    brand: optionalText(query.brand),
    ...parseMonthRange(query.monthStart, query.monthEnd)
  };
  const history = await priceHistoryRepository.findAllByUser(profile.id, filters);
  return history.map(mapPriceHistory);
}

export async function getPriceHistoryRecord(identity: LocalIdentity, id: unknown) {
  const profile = await resolveProfile(identity);
  const historyId = requireText(id, "Informe o id do historico.", 160);
  const history = await priceHistoryRepository.findById(historyId, profile.id);

  if (!history) {
    throw new AppError(404, "Historico de precos nao encontrado.");
  }

  return mapPriceHistory(history);
}

export async function createPriceHistory(identity: LocalIdentity, payload: PriceHistoryPayload) {
  const profile = await resolveProfile(identity);
  const price = parseRequiredPositiveDecimal(payload.price, "Informe um valor valido maior que zero.");
  const createdAt = parseOptionalDate(payload.createdAt);
  const listId = await resolveOptionalListId(payload.listId, profile.id);
  const productId = await resolveOptionalProductId(payload.productId, profile.id);
  const history = await priceHistoryRepository.create({
    userId: profile.id,
    listId,
    productId,
    productName: normalizeProductName(payload.productName),
    brand: normalizeOptionalText(payload.brand),
    supermarket: normalizeSupermarket(payload.supermarket),
    quantity: parseOptionalDecimal(payload.quantity, "Informe uma quantidade valida ou deixe em branco.", 3),
    price,
    ...(createdAt ? { createdAt } : {})
  });

  return mapPriceHistory(history);
}

export async function deletePriceHistory(identity: LocalIdentity, id: unknown) {
  const profile = await resolveProfile(identity);
  const historyId = requireText(id, "Informe o id do historico.", 160);
  const removed = await priceHistoryRepository.deleteHistory(historyId, profile.id);

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
    brand: input.brand?.trim() || null,
    supermarket: input.supermarket?.trim() || "Sem supermercado"
  });

  return mapPriceHistory(history);
}

export function decimalToNumber(value: Prisma.Decimal | null) {
  return value === null ? null : Number(value.toString());
}

async function resolveProfile(identity: LocalIdentity) {
  return profileRepository.ensureProfile(normalizeIdentity(identity));
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

async function resolveOptionalListId(value: unknown, userId: string) {
  const id = optionalText(value);
  if (!id) {
    return null;
  }

  const list = await priceHistoryRepository.findListById(id, userId);
  if (!list) {
    throw new AppError(404, "Lista nao encontrada.");
  }

  return list.id;
}

async function resolveOptionalProductId(value: unknown, userId: string) {
  const id = optionalText(value);
  if (!id) {
    return null;
  }

  const product = await priceHistoryRepository.findProductById(id, userId);
  if (!product) {
    throw new AppError(404, "Produto nao encontrado.");
  }

  return product.id;
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

function optionalText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function normalizeProductName(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "Produto sem nome";
}

function normalizeOptionalText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeSupermarket(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "Sem supermercado";
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
  if (!Number.isFinite(parsed) || parsed < 0) {
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
