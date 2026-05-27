export type User = {
  uid: string;
  name: string;
  email: string;
  passwordHash: string;
  securityAnswerHash: string;
  createdAt: number;
};

export type Product = {
  id: string;
  userId: string;
  name: string;
  brand: string;
  quantity: number;
  unitPrice: number;
  supermarket: string;
  timestamp: number;
  isBought: boolean;
};

export type PriceHistory = {
  id: string;
  userId: string;
  productName: string;
  brand: string;
  price: number;
  supermarket: string;
  timestamp: number;
};

export type AppDatabase = {
  users: User[];
  products: Product[];
  priceHistory: PriceHistory[];
  activeUserId: string | null;
};

export type View = "list" | "form" | "dashboard" | "history";
