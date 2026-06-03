export type User = {
  uid: string;
  name: string;
  email: string;
  passwordHash: string;
  securityAnswerHash: string;
  createdAt: number;
};

export type PasskeyCredential = {
  id: string;
  userId: string;
  email: string;
  rawId: string;
  label: string;
  createdAt: number;
  lastUsedAt?: number;
};

export type Product = {
  id: string;
  userId: string;
  listId: string;
  name: string;
  brand?: string;
  quantity: number | null;
  unitPrice: number | null;
  supermarket: string;
  timestamp: number;
  isBought: boolean;
  sortOrder: number;
};

export type ShoppingList = {
  id: string;
  userId: string;
  name: string;
  color: string;
  createdAt: number;
  updatedAt: number;
};

export type PriceHistory = {
  id: string;
  userId: string;
  listId?: string;
  productId?: string;
  productName: string;
  brand?: string;
  quantity?: number | null;
  price: number;
  supermarket: string;
  timestamp: number;
};

export type AppDatabase = {
  users: User[];
  passkeys: PasskeyCredential[];
  lists: ShoppingList[];
  products: Product[];
  priceHistory: PriceHistory[];
  activeUserId: string | null;
};

export type View = "home" | "list" | "shared" | "dashboard" | "history";
