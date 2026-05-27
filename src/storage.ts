import type { AppDatabase, PriceHistory, Product, User } from "./types";

const DB_KEY = "app-supermarket-db-v2";

const emptyDb: AppDatabase = {
  users: [],
  products: [],
  priceHistory: [],
  activeUserId: null
};

export function createId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export async function hashText(value: string) {
  const input = new TextEncoder().encode(value.trim().toLowerCase());
  const digest = await crypto.subtle.digest("SHA-256", input);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function loadDatabase(): AppDatabase {
  try {
    const stored = localStorage.getItem(DB_KEY);
    if (!stored) {
      return emptyDb;
    }

    const parsed = JSON.parse(stored) as Partial<AppDatabase>;
    return {
      users: parsed.users ?? [],
      products: parsed.products ?? [],
      priceHistory: parsed.priceHistory ?? [],
      activeUserId: parsed.activeUserId ?? null
    };
  } catch {
    return emptyDb;
  }
}

export function saveDatabase(database: AppDatabase) {
  localStorage.setItem(DB_KEY, JSON.stringify(database));
}

export function getUserData(database: AppDatabase, userId: string) {
  return {
    products: database.products.filter((product) => product.userId === userId),
    priceHistory: database.priceHistory.filter((history) => history.userId === userId)
  };
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function sortByNewest<T extends Product | PriceHistory>(items: T[]) {
  return items.slice().sort((a, b) => b.timestamp - a.timestamp);
}

export function omitUserSensitiveFields(user: User) {
  return {
    uid: user.uid,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt
  };
}
