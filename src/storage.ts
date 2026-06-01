import type { AppDatabase, PriceHistory, Product, ShoppingList, User } from "./types";

const DB_KEY = "app-supermarket-db-v2";

const emptyDb: AppDatabase = {
  users: [],
  passkeys: [],
  lists: [],
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
    return normalizeDatabase({
      users: parsed.users ?? [],
      passkeys: parsed.passkeys ?? [],
      lists: parsed.lists ?? [],
      products: parsed.products ?? [],
      priceHistory: parsed.priceHistory ?? [],
      activeUserId: parsed.activeUserId ?? null
    });
  } catch {
    return emptyDb;
  }
}

export function saveDatabase(database: AppDatabase) {
  localStorage.setItem(DB_KEY, JSON.stringify(database));
}

export function getUserData(database: AppDatabase, userId: string) {
  return {
    lists: database.lists.filter((list) => list.userId === userId),
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

function normalizeDatabase(database: AppDatabase): AppDatabase {
  const lists = [...database.lists];
  const products = database.products.map((product) => ({ ...product }));

  for (const user of database.users) {
    const userProducts = products.filter((product) => product.userId === user.uid);
    const hasUserList = lists.some((list) => list.userId === user.uid);
    if (userProducts.length > 0 && !hasUserList) {
      lists.push(createDefaultList(user.uid));
    }

    const defaultList = lists.find((list) => list.userId === user.uid);
    if (defaultList) {
      for (const product of userProducts) {
        if (!product.listId) {
          product.listId = defaultList.id;
        }
        product.quantity = Number.isFinite(product.quantity) ? product.quantity : null;
        product.unitPrice = Number.isFinite(product.unitPrice) ? product.unitPrice : null;
        product.brand = product.brand ?? "";
        product.supermarket = product.supermarket ?? "";
      }
    }
  }

  return {
    ...database,
    lists,
    products,
    passkeys: database.passkeys ?? []
  };
}

function createDefaultList(userId: string): ShoppingList {
  const now = Date.now();
  return {
    id: createId("list"),
    userId,
    name: "Minha lista",
    color: "#6df7a7",
    createdAt: now,
    updatedAt: now
  };
}

export function omitUserSensitiveFields(user: User) {
  return {
    uid: user.uid,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt
  };
}
