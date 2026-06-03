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

export type ListPayload = {
  userId: string;
  name: string;
  color: string;
};

export async function getLists(userId: string) {
  return request<RemoteShoppingList[]>(`/api/lists?userId=${encodeURIComponent(userId)}`);
}

export async function getList(id: string, userId: string) {
  return request<RemoteShoppingList>(`/api/lists/${encodeURIComponent(id)}?userId=${encodeURIComponent(userId)}`);
}

export async function createList(payload: ListPayload) {
  return request<RemoteShoppingList>("/api/lists", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function updateList(id: string, payload: Partial<ListPayload> & { userId: string }) {
  return request<RemoteShoppingList>(`/api/lists/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export async function deleteList(id: string, userId: string) {
  return request<{ id: string }>(`/api/lists/${encodeURIComponent(id)}?userId=${encodeURIComponent(userId)}`, {
    method: "DELETE"
  });
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
    throw new Error(body.message ?? "Nao foi possivel acessar a API de listas.");
  }

  return body.data as T;
}
