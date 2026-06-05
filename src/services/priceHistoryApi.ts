import type { PriceHistory, User } from "../types";

export const USE_REMOTE_PRICE_HISTORY = import.meta.env.VITE_USE_REMOTE_PRICE_HISTORY === "true";

export type PriceHistoryFilters = {
  productName?: string;
  supermarket?: string;
  brand?: string;
  monthStart?: string;
  monthEnd?: string;
};

export type PriceHistoryPayload = {
  listId?: string;
  productId?: string;
  productName: string;
  brand?: string;
  supermarket?: string;
  quantity?: number | string | null;
  price: number | string;
  createdAt?: string;
};

export type PriceHistoryIdentity = Pick<User, "uid" | "email" | "name">;

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

export async function getPriceHistory(identity: PriceHistoryIdentity, filters: PriceHistoryFilters = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) {
      params.set(key, value);
    }
  }

  const suffix = params.size > 0 ? `?${params.toString()}` : "";
  const history = await request<RemotePriceHistory[]>(`/api/price-history${suffix}`, identity);
  return history.map(toLocalPriceHistory);
}

export async function createPriceHistory(identity: PriceHistoryIdentity, payload: PriceHistoryPayload) {
  const history = await request<RemotePriceHistory>("/api/price-history", identity, {
    method: "POST",
    body: JSON.stringify(payload)
  });
  return toLocalPriceHistory(history);
}

export async function deletePriceHistory(id: string, identity: PriceHistoryIdentity) {
  return request<{ id: string }>(`/api/price-history/${encodeURIComponent(id)}`, identity, {
    method: "DELETE"
  });
}

async function request<T>(url: string, identity: PriceHistoryIdentity, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  headers.set("x-superlist-user-id", encodeURIComponent(identity.uid));
  headers.set("x-superlist-user-email", encodeURIComponent(identity.email));
  headers.set("x-superlist-user-name", encodeURIComponent(identity.name));

  const response = await fetch(url, {
    ...init,
    headers
  });
  const body = (await response.json()) as { success: boolean; message?: string; data?: T };

  if (!response.ok || !body.success) {
    throw new Error(body.message ?? "Nao foi possivel acessar a API de historico de precos.");
  }

  return body.data as T;
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
