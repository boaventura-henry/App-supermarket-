import type { Product } from "../types";
import { apiRequest } from "./apiClient";

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
  expectedUpdatedAt?: string;
};

export async function getProducts(listId: string, userId: string) {
  const products = await request<RemoteProduct[]>(
    `/api/lists/${encodeURIComponent(listId)}/products?userId=${encodeURIComponent(userId)}`
  );
  return products.map((product) => toLocalProduct(product, userId, listId));
}

export async function createProduct(listId: string, payload: ProductPayload) {
  const product = await apiRequest<RemoteProduct>(
    `/api/lists/${encodeURIComponent(listId)}/products`,
    {
      method: "POST",
      body: JSON.stringify(payload)
    },
    "Nao foi possivel acessar a API de produtos."
  );
  return toLocalProduct(product, payload.userId, listId);
}

export async function updateProduct(id: string, payload: ProductPayload) {
  const product = await apiRequest<RemoteProduct>(
    `/api/products/${encodeURIComponent(id)}`,
    {
      method: "PUT",
      body: JSON.stringify(payload)
    },
    "Nao foi possivel acessar a API de produtos."
  );
  return toLocalProduct(product, payload.userId);
}

export async function deleteProduct(id: string, userId: string) {
  return apiRequest<{ id: string }>(
    `/api/products/${encodeURIComponent(id)}?userId=${encodeURIComponent(userId)}`,
    {
      method: "DELETE"
    },
    "Nao foi possivel acessar a API de produtos."
  );
}

export async function togglePurchased(id: string, userId: string, purchased: boolean) {
  const product = await apiRequest<RemoteProduct>(
    `/api/products/${encodeURIComponent(id)}/purchased`,
    {
      method: "PATCH",
      body: JSON.stringify({ userId, purchased })
    },
    "Nao foi possivel acessar a API de produtos."
  );
  return toLocalProduct(product, userId);
}

async function request<T>(url: string, init: RequestInit = {}) {
  return apiRequest<T>(url, init, "Nao foi possivel acessar a API de produtos.");
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
    sortOrder: Number.isFinite(product.sortOrder) ? product.sortOrder : 0,
    updatedAt: product.updatedAt
  };
}

function normalizeNumber(value: number | null) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
