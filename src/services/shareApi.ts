import type { ShareRole, SharedListAccess } from "../types";
import { apiRequest } from "./apiClient";

export type { ShareRole };

export function getShares(listId: string) {
  return apiRequest<SharedListAccess[]>(
    `/api/lists/${encodeURIComponent(listId)}/shares`,
    {},
    "Nao foi possivel carregar compartilhamentos."
  );
}

export function createShare(listId: string, email: string, role: ShareRole) {
  return apiRequest<SharedListAccess>(
    `/api/lists/${encodeURIComponent(listId)}/shares`,
    {
      method: "POST",
      body: JSON.stringify({ email, role })
    },
    "Nao foi possivel compartilhar a lista."
  );
}

export function updateShare(listId: string, shareId: string, role: ShareRole) {
  return apiRequest<SharedListAccess>(
    `/api/lists/${encodeURIComponent(listId)}/shares/${encodeURIComponent(shareId)}`,
    {
      method: "PUT",
      body: JSON.stringify({ role })
    },
    "Nao foi possivel atualizar o compartilhamento."
  );
}

export function deleteShare(listId: string, shareId: string) {
  return apiRequest<{ id: string }>(
    `/api/lists/${encodeURIComponent(listId)}/shares/${encodeURIComponent(shareId)}`,
    {
      method: "DELETE"
    },
    "Nao foi possivel remover o compartilhamento."
  );
}
