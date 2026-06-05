import type { ShoppingList, User } from "../types";

export const USE_REMOTE_LISTS = import.meta.env.VITE_USE_REMOTE_LISTS === "true";

export type RemoteShoppingList = {
  id: string;
  legacyId: string | null;
  userId: string;
  name: string;
  color: string;
  createdAt: string;
  updatedAt: string;
};

export type ListIdentity = Pick<User, "uid" | "email" | "name">;

export function toLocalShoppingList(list: RemoteShoppingList, localUserId: string): ShoppingList {
  return {
    id: list.id,
    userId: localUserId,
    name: list.name,
    color: list.color,
    createdAt: new Date(list.createdAt).getTime(),
    updatedAt: new Date(list.updatedAt).getTime()
  };
}

export function getLists(identity: ListIdentity) {
  return request<RemoteShoppingList[]>("/api/lists", identity);
}

export function getList(id: string, identity: ListIdentity) {
  return request<RemoteShoppingList>(`/api/lists/${encodeURIComponent(id)}`, identity);
}

export function createList(identity: ListIdentity, payload: { name: string; color: string }) {
  return request<RemoteShoppingList>("/api/lists", identity, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function updateList(id: string, identity: ListIdentity, payload: { name: string; color: string }) {
  return request<RemoteShoppingList>(`/api/lists/${encodeURIComponent(id)}`, identity, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export function deleteList(id: string, identity: ListIdentity) {
  return request<{ id: string }>(`/api/lists/${encodeURIComponent(id)}`, identity, {
    method: "DELETE"
  });
}

async function request<T>(url: string, identity: ListIdentity, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  headers.set("x-superlist-user-id", encodeURIComponent(identity.uid));
  headers.set("x-superlist-user-email", encodeURIComponent(identity.email));
  headers.set("x-superlist-user-name", encodeURIComponent(identity.name));

  const response = await fetch(url, { ...init, headers });
  const body = (await response.json()) as { success: boolean; message?: string; data?: T };

  if (!response.ok || !body.success) {
    throw new Error(body.message ?? "Nao foi possivel acessar a API de listas.");
  }

  return body.data as T;
}
