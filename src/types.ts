export type User = {
  uid: string;
  name: string;
  email: string;
  passwordHash: string;
  securityAnswerHash: string;
  createdAt: number;
};

export type AppUser = {
  id: string;
  email: string;
  name: string;
  createdAt: string;
};

export type ListAccessRole = "OWNER" | "EDITOR" | "VIEWER";
export type ShareRole = Exclude<ListAccessRole, "OWNER">;
export type ListInviteStatus = "PENDING" | "ACCEPTED" | "DECLINED" | "EXPIRED" | "CANCELED";
export type NotificationType =
  | "LIST_INVITE_RECEIVED"
  | "LIST_INVITE_ACCEPTED"
  | "LIST_INVITE_DECLINED"
  | "LIST_SHARED_ACCESS_REMOVED"
  | "PRODUCT_UPDATED"
  | "PRODUCT_PURCHASED";

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
  updatedAt?: string;
};

export type ShoppingList = {
  id: string;
  userId: string;
  name: string;
  color: string;
  createdAt: number;
  updatedAt: number;
  accessRole?: ListAccessRole;
  ownerName?: string;
  ownerEmail?: string;
};

export type SharedListAccess = {
  id: string;
  listId: string;
  userId: string;
  role: Exclude<ListAccessRole, "OWNER">;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
};

export type ListInvite = {
  id: string;
  listId: string;
  remoteListId: string;
  listName: string;
  listColor: string;
  ownerName: string;
  ownerEmail: string;
  invitedEmail: string;
  invitedUserId: string | null;
  invitedByUserId: string;
  invitedByName: string;
  invitedByEmail: string;
  role: ShareRole;
  status: ListInviteStatus;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AppNotification = {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  readAt: string | null;
  metadata: unknown;
  createdAt: string;
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

export type View = "home" | "list" | "shared" | "invites" | "notifications" | "dashboard" | "history" | "migration";
