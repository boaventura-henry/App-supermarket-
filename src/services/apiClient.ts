import { getAccessToken } from "./authService";

export async function apiRequest<T>(url: string, init: RequestInit = {}, fallbackMessage = "Nao foi possivel acessar a API.") {
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const token = await getAccessToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...init,
    headers
  });
  const body = (await response.json()) as { success: boolean; message?: string; data?: T };

  if (!response.ok || !body.success) {
    throw new Error(body.message ?? fallbackMessage);
  }

  return body.data as T;
}
