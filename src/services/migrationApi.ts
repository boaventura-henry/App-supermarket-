import type { PasskeyCredential, PriceHistory, Product, ShoppingList, User } from "../types";

export const ENABLE_LOCAL_DATA_MIGRATION = import.meta.env.VITE_ENABLE_LOCAL_DATA_MIGRATION === "true";

export type LocalDataMigrationPayload = {
  user: User;
  lists: ShoppingList[];
  products: Product[];
  priceHistory: PriceHistory[];
  passkeys: PasskeyCredential[];
};

export type MigrationSummary = {
  userImported: number;
  userSkipped: number;
  listsImported: number;
  listsSkipped: number;
  productsImported: number;
  productsSkipped: number;
  priceHistoryImported: number;
  priceHistorySkipped: number;
  passkeysImported: number;
  passkeysSkipped: number;
  duplicatesDetected: number;
};

export type MigrationResult = {
  summary: MigrationSummary;
  warnings: string[];
};

export async function importLocalData(payload: LocalDataMigrationPayload) {
  return request<MigrationResult>("/api/migration/import-local-data", {
    method: "POST",
    body: JSON.stringify(payload)
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
    throw new Error(body.message ?? "Nao foi possivel importar os dados locais.");
  }

  return body.data as T;
}
