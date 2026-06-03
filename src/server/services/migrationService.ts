import { Prisma } from "@prisma/client";
import { AppError } from "../errors";
import * as migrationRepository from "../repositories/migrationRepository";

const MAX_IMPORT_ITEMS = 20000;
const PASSWORD_PLACEHOLDER = "local-auth-pending-supabase-auth";

type LocalUser = {
  uid?: unknown;
  name?: unknown;
  email?: unknown;
  passwordHash?: unknown;
  securityAnswerHash?: unknown;
  createdAt?: unknown;
};

type LocalList = {
  id?: unknown;
  userId?: unknown;
  name?: unknown;
  color?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
};

type LocalProduct = {
  id?: unknown;
  userId?: unknown;
  listId?: unknown;
  name?: unknown;
  brand?: unknown;
  quantity?: unknown;
  unitPrice?: unknown;
  supermarket?: unknown;
  timestamp?: unknown;
  isBought?: unknown;
  purchased?: unknown;
  sortOrder?: unknown;
};

type LocalPriceHistory = {
  id?: unknown;
  userId?: unknown;
  listId?: unknown;
  productId?: unknown;
  productName?: unknown;
  brand?: unknown;
  quantity?: unknown;
  price?: unknown;
  supermarket?: unknown;
  timestamp?: unknown;
  createdAt?: unknown;
};

type LocalPasskey = {
  id?: unknown;
  userId?: unknown;
  email?: unknown;
  rawId?: unknown;
  label?: unknown;
  createdAt?: unknown;
  lastUsedAt?: unknown;
};

type MigrationPayload = {
  user?: LocalUser;
  lists?: LocalList[];
  products?: LocalProduct[];
  priceHistory?: LocalPriceHistory[];
  passkeys?: LocalPasskey[];
};

type MigrationSummary = {
  userImported: number;
  userSkipped: number;
  listsImported: number;
  listsSkipped: number;
  productsImported: number;
  productsSkipped: number;
  priceHistoryImported: number;
  priceHistorySkipped: number;
  passkeysImported: number;
  passkeysSkipped: number;
  duplicatesDetected: number;
};

export type MigrationAuthUser = {
  id: string;
  email: string;
  name: string;
};

export async function importLocalData(payload: unknown, authUser?: MigrationAuthUser | null) {
  const input = normalizePayload(payload);
  const warnings: string[] = [];
  const summary: MigrationSummary = {
    userImported: 0,
    userSkipped: 0,
    listsImported: 0,
    listsSkipped: 0,
    productsImported: 0,
    productsSkipped: 0,
    priceHistoryImported: 0,
    priceHistorySkipped: 0,
    passkeysImported: 0,
    passkeysSkipped: 0,
    duplicatesDetected: 0
  };

  return migrationRepository.runImportTransaction(async (client) => {
    const sourceUserId = requireLocalId(input.user.uid);
    const user = await ensureUser(client, input.user, summary, warnings, authUser);
    const listIdMap = new Map<string, string>();
    const productIdMap = new Map<string, string>();

    for (const item of input.lists) {
      const normalized = normalizeList(item, sourceUserId, warnings);
      if (!normalized) {
        summary.listsSkipped += 1;
        continue;
      }

      const existing = await migrationRepository.findListByLegacyId(client, normalized.legacyId);
      if (existing) {
        summary.listsSkipped += 1;
        summary.duplicatesDetected += 1;
        listIdMap.set(normalized.legacyId, existing.id);
        continue;
      }

      const created = await migrationRepository.createList(client, {
        ...normalized,
        userId: user.id
      });
      summary.listsImported += 1;
      listIdMap.set(normalized.legacyId, created.id);
    }

    for (const item of input.products) {
      const normalized = normalizeProduct(item, sourceUserId, listIdMap, warnings);
      if (!normalized) {
        summary.productsSkipped += 1;
        continue;
      }

      const existingByLegacy = await migrationRepository.findProductByLegacyId(client, normalized.legacyId);
      const existing =
        existingByLegacy ??
        (await migrationRepository.findProductDuplicate(client, {
          userId: user.id,
          listId: normalized.listId,
          name: normalized.name,
          sortOrder: normalized.sortOrder
        }));

      if (existing) {
        summary.productsSkipped += 1;
        summary.duplicatesDetected += 1;
        productIdMap.set(normalized.legacyId, existing.id);
        continue;
      }

      const created = await migrationRepository.createProduct(client, {
        ...normalized,
        userId: user.id
      });
      summary.productsImported += 1;
      productIdMap.set(normalized.legacyId, created.id);
    }

    for (const item of input.priceHistory) {
      const normalized = normalizePriceHistory(item, sourceUserId, listIdMap, productIdMap, warnings);
      if (!normalized) {
        summary.priceHistorySkipped += 1;
        continue;
      }

      const existingByLegacy = await migrationRepository.findPriceHistoryByLegacyId(client, normalized.legacyId);
      const existing =
        existingByLegacy ??
        (await migrationRepository.findPriceHistoryDuplicate(client, {
          userId: user.id,
          productName: normalized.productName,
          supermarket: normalized.supermarket,
          price: normalized.price,
          createdAt: normalized.createdAt
        }));

      if (existing) {
        summary.priceHistorySkipped += 1;
        summary.duplicatesDetected += 1;
        continue;
      }

      await migrationRepository.createPriceHistory(client, {
        ...normalized,
        userId: user.id
      });
      summary.priceHistoryImported += 1;
    }

    for (const item of input.passkeys) {
      const normalized = normalizePasskey(item, sourceUserId, user.email, warnings);
      if (!normalized) {
        summary.passkeysSkipped += 1;
        continue;
      }

      const existing = await migrationRepository.findPasskey(client, user.id, normalized.rawId);
      if (existing) {
        summary.passkeysSkipped += 1;
        summary.duplicatesDetected += 1;
        continue;
      }

      await migrationRepository.createPasskey(client, {
        ...normalized,
        userId: user.id
      });
      summary.passkeysImported += 1;
    }

    return {
      summary,
      warnings
    };
  });
}

function normalizePayload(payload: unknown): Required<MigrationPayload> {
  if (!isRecord(payload)) {
    throw new AppError(400, "Payload de importacao invalido.");
  }

  const user = isRecord(payload.user) ? (payload.user as LocalUser) : null;
  if (!user) {
    throw new AppError(400, "Informe o usuario local para importar.");
  }

  const lists = Array.isArray(payload.lists) ? (payload.lists as LocalList[]) : [];
  const products = Array.isArray(payload.products) ? (payload.products as LocalProduct[]) : [];
  const priceHistory = Array.isArray(payload.priceHistory) ? (payload.priceHistory as LocalPriceHistory[]) : [];
  const passkeys = Array.isArray(payload.passkeys) ? (payload.passkeys as LocalPasskey[]) : [];
  const totalItems = lists.length + products.length + priceHistory.length + passkeys.length;

  if (totalItems > MAX_IMPORT_ITEMS) {
    throw new AppError(400, "Payload muito grande para importacao.");
  }

  return { user, lists, products, priceHistory, passkeys };
}

async function ensureUser(
  client: Prisma.TransactionClient,
  user: LocalUser,
  summary: MigrationSummary,
  warnings: string[],
  authUser?: MigrationAuthUser | null
) {
  const legacyId = authUser ? authUser.id : requireLocalId(user.uid);
  const email = authUser ? normalizeEmail(authUser.email) : normalizeEmail(user.email);
  const existing = await migrationRepository.findUser(client, legacyId, email);
  if (existing) {
    summary.userSkipped = 1;
    summary.duplicatesDetected += 1;
    if (!existing.legacyId) {
      return migrationRepository.attachUserLegacyId(client, existing.id, legacyId);
    }
    return existing;
  }

  const passwordHash = typeof user.passwordHash === "string" && user.passwordHash ? user.passwordHash : PASSWORD_PLACEHOLDER;
  const securityAnswerHash =
    typeof user.securityAnswerHash === "string" && user.securityAnswerHash ? user.securityAnswerHash : PASSWORD_PLACEHOLDER;
  if (passwordHash === PASSWORD_PLACEHOLDER || securityAnswerHash === PASSWORD_PLACEHOLDER) {
    warnings.push("Usuario importado com autenticacao temporaria. Supabase Auth deve substituir este fluxo em fase futura.");
  }

  const created = await migrationRepository.createUser(client, {
    legacyId,
    name: authUser?.name || normalizeName(user.name, "Usuario local"),
    email,
    passwordHash,
    securityAnswerHash,
    createdAt: normalizeDate(user.createdAt)
  });
  summary.userImported = 1;
  return created;
}

function normalizeList(item: LocalList, currentUserId: string, warnings: string[]) {
  const legacyId = optionalString(item.id);
  if (!legacyId || optionalString(item.userId) !== currentUserId) {
    warnings.push("Lista ignorada por id ausente ou usuario diferente.");
    return null;
  }

  return {
    legacyId,
    name: normalizeName(item.name, "Lista sem nome"),
    color: normalizeColor(item.color),
    createdAt: normalizeDate(item.createdAt),
    updatedAt: normalizeDate(item.updatedAt ?? item.createdAt)
  };
}

function normalizeProduct(
  item: LocalProduct,
  currentUserId: string,
  listIdMap: Map<string, string>,
  warnings: string[]
) {
  const legacyId = optionalString(item.id);
  const localListId = optionalString(item.listId);
  const name = optionalString(item.name);
  if (!legacyId || optionalString(item.userId) !== currentUserId || !localListId || !name) {
    warnings.push("Produto ignorado por id, lista, usuario ou nome invalido.");
    return null;
  }

  const listId = listIdMap.get(localListId);
  if (!listId) {
    warnings.push(`Produto "${name}" ignorado porque a lista local nao foi importada.`);
    return null;
  }

  const quantity = parseOptionalDecimal(item.quantity, 3);
  const unitPrice = parseOptionalDecimal(item.unitPrice, 2);

  return {
    legacyId,
    listId,
    name,
    brand: normalizeOptionalText(item.brand),
    quantity,
    unitPrice,
    supermarket: normalizeOptionalText(item.supermarket),
    purchased: Boolean(item.isBought ?? item.purchased),
    sortOrder: normalizeInteger(item.sortOrder, 0),
    createdAt: normalizeDate(item.timestamp),
    updatedAt: normalizeDate(item.timestamp)
  };
}

function normalizePriceHistory(
  item: LocalPriceHistory,
  currentUserId: string,
  listIdMap: Map<string, string>,
  productIdMap: Map<string, string>,
  warnings: string[]
) {
  const legacyId = optionalString(item.id);
  if (!legacyId || optionalString(item.userId) !== currentUserId) {
    warnings.push("Historico ignorado por id ausente ou usuario diferente.");
    return null;
  }

  const price = parseOptionalDecimal(item.price, 2);
  if (!price || price.lessThanOrEqualTo(0)) {
    warnings.push("Historico ignorado por preco invalido ou zerado.");
    return null;
  }

  return {
    legacyId,
    listId: optionalString(item.listId) ? listIdMap.get(optionalString(item.listId) as string) ?? null : null,
    productId: optionalString(item.productId) ? productIdMap.get(optionalString(item.productId) as string) ?? null : null,
    productName: normalizeName(item.productName, "Produto sem nome"),
    brand: normalizeOptionalText(item.brand),
    supermarket: normalizeName(item.supermarket, "Sem supermercado"),
    quantity: parseOptionalDecimal(item.quantity, 3),
    price,
    createdAt: normalizeDate(item.createdAt ?? item.timestamp)
  };
}

function normalizePasskey(item: LocalPasskey, currentUserId: string, fallbackEmail: string, warnings: string[]) {
  const legacyId = optionalString(item.id);
  const rawId = optionalString(item.rawId);
  if (!legacyId || optionalString(item.userId) !== currentUserId || !rawId) {
    warnings.push("Passkey ignorada por metadados incompletos.");
    return null;
  }

  return {
    legacyId,
    email: normalizeEmail(item.email ?? fallbackEmail),
    rawId,
    label: normalizeName(item.label, "Dispositivo"),
    createdAt: normalizeDate(item.createdAt),
    lastUsedAt: optionalDate(item.lastUsedAt)
  };
}

function requireLocalId(value: unknown) {
  const id = optionalString(value);
  if (!id) {
    throw new AppError(400, "Usuario local invalido.");
  }
  return id;
}

function normalizeEmail(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    throw new AppError(400, "E-mail local invalido.");
  }
  return value.trim().toLowerCase();
}

function normalizeName(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizeOptionalText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeColor(value: unknown) {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value.trim()) ? value.trim() : "#6df7a7";
}

function normalizeInteger(value: unknown, fallback: number) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

function parseOptionalDecimal(value: unknown, decimalPlaces: number) {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  const parsed = typeof value === "number" ? value : Number(String(value).replace(",", "."));
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }
  return new Prisma.Decimal(parsed.toFixed(decimalPlaces));
}

function normalizeDate(value: unknown) {
  const parsed = optionalDate(value);
  return parsed ?? new Date();
}

function optionalDate(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return new Date(value);
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

function optionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
