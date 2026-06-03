import type { PriceHistory } from "../types";
import { apiRequest } from "./apiClient";

export const USE_REMOTE_PRICE_HISTORY = import.meta.env.VITE_USE_REMOTE_PRICE_HISTORY === "true";

export type PriceHistoryFilters = {
  productName?: string;
  supermarket?: string;
  brand?: string;
  monthStart?: string;
  monthEnd?: string;
};

export type PriceHistoryPayload = {
  userId: string;
  listId?: string;
  productId?: string;
  productName: string;
  brand?: string;
  supermarket?: string;
  quantity?: number | string | null;
  price: number | string;
  createdAt?: string;
};

type RemotePriceHistory = {
  id: string;
  remoteId?: string;
  legacyId: string | null;
  userId: string;
  listId?: string;
  productId?: string;
  productName: string;
  brand: string;
  supermarket: string;
  quantity?: number | null;
  price: number;
  timestamp: number;
  createdAt: string;
};

export async function getPriceHistory(userId: string, filters: PriceHistoryFilters = {}) {
  const params = new URLSearchParams({ userId });
  for (const [key, value] of Object.entries(filters)) {
    if (value) {
      params.set(key, value);
    }
  }

  const history = await apiRequest<RemotePriceHistory[]>(
    `/api/price-history?${params.toString()}`,
    {},
    "Nao foi possivel acessar a API de historico de precos."
  );
  return history.map(toLocalPriceHistory);
}

export async function createPriceHistory(payload: PriceHistoryPayload) {
  const history = await apiRequest<RemotePriceHistory>(
    "/api/price-history",
    {
      method: "POST",
      body: JSON.stringify(payload)
    },
    "Nao foi possivel acessar a API de historico de precos."
  );
  return toLocalPriceHistory(history);
}

export async function deletePriceHistory(id: string, userId: string) {
  return apiRequest<{ id: string }>(
    `/api/price-history/${encodeURIComponent(id)}?userId=${encodeURIComponent(userId)}`,
    {
      method: "DELETE"
    },
    "Nao foi possivel acessar a API de historico de precos."
  );
}

function toLocalPriceHistory(history: RemotePriceHistory): PriceHistory {
  const timestamp = Number.isFinite(history.timestamp) ? history.timestamp : Date.parse(history.createdAt);
  return {
    id: history.id,
    userId: history.userId,
    listId: history.listId,
    productId: history.productId,
    productName: history.productName || "Produto sem nome",
    brand: history.brand ?? "",
    quantity: normalizeNumber(history.quantity ?? null),
    price: normalizeNumber(history.price) ?? 0,
    supermarket: history.supermarket || "Sem supermercado",
    timestamp: Number.isFinite(timestamp) ? timestamp : Date.now()
  };
}

function normalizeNumber(value: number | null) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
