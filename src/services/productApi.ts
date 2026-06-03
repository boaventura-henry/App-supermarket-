import type { Product } from "../types";

export const USE_REMOTE_PRODUCTS = import.meta.env.VITE_USE_REMOTE_PRODUCTS === "true";

export type RemoteProduct = {
  id: string;
  remoteId?: string;
  legacyId: string | null;
  userId: string;
  listId: string;
  name: string;
  brand: string;
  quantity: number | null;
  unitPrice: number | null;
  supermarket: string;
  purchased: boolean;
  isBought?: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type ProductPayload = {
  userId: string;
  name?: string;
  brand?: string;
  quantity?: number | string | null;
  unitPrice?: number | string | null;
  supermarket?: string;
};

export async function getProducts(listId: string, userId: string) {
  const products = await request<RemoteProduct[]>(
    `/api/lists/${encodeURIComponent(listId)}/products?userId=${encodeURIComponent(userId)}`
  );
  return products.map((product) => toLocalProduct(product, userId, listId));
}

export async function createProduct(listId: string, payload: ProductPayload) {
  const product = await request<RemoteProduct>(`/api/lists/${encodeURIComponent(listId)}/products`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
  return toLocalProduct(product, payload.userId, listId);
}

export async function updateProduct(id: string, payload: ProductPayload) {
  const product = await request<RemoteProduct>(`/api/products/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
  return toLocalProduct(product, payload.userId);
}

export async function deleteProduct(id: string, userId: string) {
  return request<{ id: string }>(`/api/products/${encodeURIComponent(id)}?userId=${encodeURIComponent(userId)}`, {
    method: "DELETE"
  });
}

export async function togglePurchased(id: string, userId: string, purchased: boolean) {
  const product = await request<RemoteProduct>(`/api/products/${encodeURIComponent(id)}/purchased`, {
    method: "PATCH",
    body: JSON.stringify({ userId, purchased })
  });
  return toLocalProduct(product, userId);
}

async function request<T>(url: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, {
    ...init,
    headers
  });
  const body = (await response.json()) as { success: boolean; message?: string; data?: T };

  if (!response.ok || !body.success) {
    throw new Error(body.message ?? "Nao foi possivel acessar a API de produtos.");
  }

  return body.data as T;
}

function toLocalProduct(product: RemoteProduct, fallbackUserId: string, fallbackListId?: string): Product {
  const timestamp = Date.parse(product.createdAt);
  return {
    id: product.id,
    userId: product.userId || fallbackUserId,
    listId: product.listId || fallbackListId || "",
    name: product.name,
    brand: product.brand ?? "",
    quantity: normalizeNumber(product.quantity),
    unitPrice: normalizeNumber(product.unitPrice),
    supermarket: product.supermarket ?? "",
    timestamp: Number.isFinite(timestamp) ? timestamp : Date.now(),
    isBought: product.purchased ?? Boolean(product.isBought),
    sortOrder: Number.isFinite(product.sortOrder) ? product.sortOrder : 0
  };
}

function normalizeNumber(value: number | null) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
