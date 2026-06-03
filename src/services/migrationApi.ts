import type { PasskeyCredential, PriceHistory, Product, ShoppingList, User } from "../types";
import { apiRequest } from "./apiClient";

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
  return apiRequest<MigrationResult>(
    "/api/migration/import-local-data",
    {
      method: "POST",
      body: JSON.stringify(payload)
    },
    "Nao foi possivel importar os dados locais."
  );
}
