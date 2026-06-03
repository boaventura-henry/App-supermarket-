import { apiRequest } from "./apiClient";

export const USE_REMOTE_LISTS = import.meta.env.VITE_USE_REMOTE_LISTS === "true";

export type RemoteShoppingList = {
  id: string;
  remoteId?: string;
  legacyId: string | null;
  userId: string;
  name: string;
  color: string;
  createdAt: string;
  updatedAt: string;
  accessRole?: "OWNER" | "EDITOR" | "VIEWER";
  ownerName?: string;
  ownerEmail?: string;
};

export type ListPayload = {
  userId: string;
  name: string;
  color: string;
};

export async function getLists(userId: string) {
  return apiRequest<RemoteShoppingList[]>(`/api/lists?userId=${encodeURIComponent(userId)}`, {}, "Nao foi possivel acessar a API de listas.");
}

export async function getList(id: string, userId: string) {
  return apiRequest<RemoteShoppingList>(
    `/api/lists/${encodeURIComponent(id)}?userId=${encodeURIComponent(userId)}`,
    {},
    "Nao foi possivel acessar a API de listas."
  );
}

export async function createList(payload: ListPayload) {
  return apiRequest<RemoteShoppingList>(
    "/api/lists",
    {
      method: "POST",
      body: JSON.stringify(payload)
    },
    "Nao foi possivel acessar a API de listas."
  );
}

export async function updateList(id: string, payload: Partial<ListPayload> & { userId: string }) {
  return apiRequest<RemoteShoppingList>(
    `/api/lists/${encodeURIComponent(id)}`,
    {
      method: "PUT",
      body: JSON.stringify(payload)
    },
    "Nao foi possivel acessar a API de listas."
  );
}

export async function deleteList(id: string, userId: string) {
  return apiRequest<{ id: string }>(
    `/api/lists/${encodeURIComponent(id)}?userId=${encodeURIComponent(userId)}`,
    {
      method: "DELETE"
    },
    "Nao foi possivel acessar a API de listas."
  );
}
