import type { Product, User } from "../types";

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
  name?: string;
  brand?: string;
  quantity?: number | string | null;
  unitPrice?: number | string | null;
  supermarket?: string;
};

export type ProductIdentity = Pick<User, "uid" | "email" | "name">;

export async function getProducts(listId: string, identity: ProductIdentity) {
  const products = await request<RemoteProduct[]>(`/api/lists/${encodeURIComponent(listId)}/products`, identity);
  return products.map((product) => toLocalProduct(product, identity.uid, listId));
}

export async function createProduct(listId: string, identity: ProductIdentity, payload: ProductPayload) {
  const product = await request<RemoteProduct>(`/api/lists/${encodeURIComponent(listId)}/products`, identity, {
    method: "POST",
    body: JSON.stringify(payload)
  });
  return toLocalProduct(product, identity.uid, listId);
}

export async function updateProduct(id: string, identity: ProductIdentity, payload: ProductPayload) {
  const product = await request<RemoteProduct>(`/api/products/${encodeURIComponent(id)}`, identity, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
  return toLocalProduct(product, identity.uid);
}

export async function deleteProduct(id: string, identity: ProductIdentity) {
  return request<{ id: string }>(`/api/products/${encodeURIComponent(id)}`, identity, {
    method: "DELETE"
  });
}

export async function togglePurchased(id: string, identity: ProductIdentity, purchased: boolean) {
  const product = await request<RemoteProduct>(`/api/products/${encodeURIComponent(id)}/purchased`, identity, {
    method: "PATCH",
    body: JSON.stringify({ purchased })
  });
  return toLocalProduct(product, identity.uid);
}

async function request<T>(url: string, identity: ProductIdentity, init: RequestInit = {}) {
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
