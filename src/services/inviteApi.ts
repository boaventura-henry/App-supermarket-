import type { ListInvite, ShareRole } from "../types";
import { apiRequest } from "./apiClient";

export function getMyInvites() {
  return apiRequest<ListInvite[]>("/api/invites", {}, "Nao foi possivel carregar convites.");
}

export function getListInvites(listId: string) {
  return apiRequest<ListInvite[]>(
    `/api/lists/${encodeURIComponent(listId)}/invites`,
    {},
    "Nao foi possivel carregar convites da lista."
  );
}

export function createInvite(listId: string, payload: { email: string; role: ShareRole }) {
  return apiRequest<ListInvite>(
    `/api/lists/${encodeURIComponent(listId)}/invites`,
    {
      method: "POST",
      body: JSON.stringify(payload)
    },
    "Nao foi possivel enviar o convite."
  );
}

export function acceptInvite(inviteId: string) {
  return apiRequest<ListInvite>(
    `/api/invites/${encodeURIComponent(inviteId)}/accept`,
    { method: "POST" },
    "Nao foi possivel aceitar o convite."
  );
}

export function declineInvite(inviteId: string) {
  return apiRequest<ListInvite>(
    `/api/invites/${encodeURIComponent(inviteId)}/decline`,
    { method: "POST" },
    "Nao foi possivel recusar o convite."
  );
}

export function cancelInvite(inviteId: string) {
  return apiRequest<ListInvite>(
    `/api/invites/${encodeURIComponent(inviteId)}`,
    { method: "DELETE" },
    "Nao foi possivel cancelar o convite."
  );
}
