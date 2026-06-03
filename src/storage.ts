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
  const fallbackUserId = database.activeUserId ?? database.users[0]?.uid ?? "legacy-user";
  const lists = database.lists.map((list) => ({ ...list, userId: list.userId || fallbackUserId }));
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

  const nextOrderByList = new Map<string, number>();
  for (const product of products) {
    const key = `${product.userId}:${product.listId}`;
    const currentOrder = nextOrderByList.get(key) ?? 0;
    if (Number.isFinite(product.sortOrder)) {
      nextOrderByList.set(key, Math.max(currentOrder, product.sortOrder + 1));
      continue;
    }
    product.sortOrder = currentOrder;
    nextOrderByList.set(key, currentOrder + 1);
  }

  const priceHistory = database.priceHistory
    .map((history) => ({
      ...history,
      productName: history.productName?.trim() || "Produto sem nome",
      brand: history.brand ?? "",
      price: Number.isFinite(history.price) && history.price >= 0 ? history.price : 0,
      supermarket: history.supermarket?.trim() || "Sem supermercado",
      timestamp: Number.isFinite(history.timestamp) ? history.timestamp : Date.now()
    }))
    .filter((history) => history.price > 0);

  return {
    ...database,
    lists,
    products,
    priceHistory,
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
