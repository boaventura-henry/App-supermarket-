import type { AppNotification } from "../types";
import { apiRequest } from "./apiClient";

export function getNotifications() {
  return apiRequest<AppNotification[]>("/api/notifications", {}, "Nao foi possivel carregar notificacoes.");
}

export function markAsRead(id: string) {
  return apiRequest<AppNotification>(
    `/api/notifications/${encodeURIComponent(id)}/read`,
    { method: "PATCH" },
    "Nao foi possivel marcar notificacao como lida."
  );
}

export function markAllAsRead() {
  return apiRequest<{ count: number }>(
    "/api/notifications/read-all",
    { method: "PATCH" },
    "Nao foi possivel marcar notificacoes como lidas."
  );
}
