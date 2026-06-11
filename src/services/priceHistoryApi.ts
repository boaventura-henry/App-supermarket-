import type { PriceHistory, User } from "../types";
import { isSupabaseConfigured, requireSupabaseClient } from "../lib/supabaseClient";
import { getSharedLists } from "./shareApi";

export const USE_REMOTE_PRICE_HISTORY = isSupabaseConfigured;

export type PriceHistoryFilters = {
  productName?: string;
  supermarket?: string;
  brand?: string;
  monthStart?: string;
  monthEnd?: string;
};

export type PriceHistoryPayload = {
  listId?: string;
  productId?: string;
  productName: string;
  brand?: string;
  supermarket?: string;
  quantity?: number | string | null;
  price: number | string;
  createdAt?: string;
};

export type PriceHistoryIdentity = Pick<User, "uid" | "email" | "name">;

type RemotePriceHistory = {
  id: string;
  legacy_id?: string | null;
  user_id: string;
  list_id?: string | null;
  product_id?: string | null;
  product_name: string;
  brand: string | null;
  supermarket: string | null;
  quantity?: number | string | null;
  price: number | string;
  created_at: string;
};

const historySelect =
  "id, legacy_id, user_id, list_id, product_id, product_name, brand, supermarket, quantity, price, created_at";

export async function getPriceHistory(identity: PriceHistoryIdentity, filters: PriceHistoryFilters = {}) {
  const supabase = requireSupabaseClient();
  let ownQuery = supabase
    .from("price_history")
    .select(historySelect)
    .eq("user_id", identity.uid)
    .order("created_at", { ascending: false });

  if (filters.productName) {
    ownQuery = ownQuery.ilike("product_name", `%${filters.productName}%`);
  }
  if (filters.supermarket) {
    ownQuery = ownQuery.ilike("supermarket", `%${filters.supermarket}%`);
  }
  if (filters.brand) {
    ownQuery = ownQuery.ilike("brand", `%${filters.brand}%`);
  }
  if (filters.monthStart) {
    ownQuery = ownQuery.gte("created_at", `${filters.monthStart}-01T00:00:00.000Z`);
  }
  if (filters.monthEnd) {
    ownQuery = ownQuery.lt("created_at", nextMonthIso(filters.monthEnd));
  }

  const [{ data, error }, sharedLists] = await Promise.all([ownQuery, getSharedLists(identity)]);

  if (error) {
    throw new Error(`Nao foi possivel carregar o historico: ${error.message}`);
  }

  const sharedListIds = sharedLists.map((list) => list.id);
  let sharedData: RemotePriceHistory[] = [];
  if (sharedListIds.length > 0) {
    let sharedQuery = supabase
      .from("price_history")
      .select(historySelect)
      .in("list_id", sharedListIds)
      .order("created_at", { ascending: false });
    if (filters.productName) {
      sharedQuery = sharedQuery.ilike("product_name", `%${filters.productName}%`);
    }
    if (filters.supermarket) {
      sharedQuery = sharedQuery.ilike("supermarket", `%${filters.supermarket}%`);
    }
    if (filters.brand) {
      sharedQuery = sharedQuery.ilike("brand", `%${filters.brand}%`);
    }
    if (filters.monthStart) {
      sharedQuery = sharedQuery.gte("created_at", `${filters.monthStart}-01T00:00:00.000Z`);
    }
    if (filters.monthEnd) {
      sharedQuery = sharedQuery.lt("created_at", nextMonthIso(filters.monthEnd));
    }
    const { data: sharedHistory, error: sharedError } = await sharedQuery;
    if (sharedError) {
      throw new Error(`Nao foi possivel carregar historico compartilhado: ${sharedError.message}`);
    }
    sharedData = (sharedHistory ?? []) as RemotePriceHistory[];
  }

  const uniqueHistory = new Map<string, RemotePriceHistory>();
  for (const item of [...((data ?? []) as RemotePriceHistory[]), ...sharedData]) {
    uniqueHistory.set(item.id, item);
  }

  return Array.from(uniqueHistory.values())
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
    .map(toLocalPriceHistory);
}

export async function createPriceHistory(identity: PriceHistoryIdentity, payload: PriceHistoryPayload) {
  const supabase = requireSupabaseClient();
  const price = normalizeNumber(payload.price);
  if (price === null || price <= 0) {
    throw new Error("Informe um preco valido para o historico.");
  }

  const { data, error } = await supabase
    .from("price_history")
    .insert({
      user_id: identity.uid,
      list_id: payload.listId ?? null,
      product_id: payload.productId ?? null,
      product_name: payload.productName.trim(),
      brand: payload.brand?.trim() || null,
      supermarket: payload.supermarket?.trim() || null,
      quantity: normalizeNumber(payload.quantity ?? null),
      price,
      created_at: payload.createdAt ?? new Date().toISOString()
    })
    .select(historySelect)
    .single();

  if (error) {
    throw new Error(`Nao foi possivel salvar o historico: ${error.message}`);
  }

  return toLocalPriceHistory(data as RemotePriceHistory);
}

export async function deletePriceHistory(id: string, identity: PriceHistoryIdentity) {
  const supabase = requireSupabaseClient();
  const { error } = await supabase.from("price_history").delete().eq("id", id).eq("user_id", identity.uid);

  if (error) {
    throw new Error(`Nao foi possivel excluir o historico: ${error.message}`);
  }

  return { id };
}

function toLocalPriceHistory(history: RemotePriceHistory): PriceHistory {
  const timestamp = Date.parse(history.created_at);
  return {
    id: history.id,
    userId: history.user_id,
    listId: history.list_id ?? undefined,
    productId: history.product_id ?? undefined,
    productName: history.product_name || "Produto sem nome",
    brand: history.brand ?? "",
    quantity: normalizeNumber(history.quantity ?? null),
    price: normalizeNumber(history.price) ?? 0,
    supermarket: history.supermarket || "Sem supermercado",
    timestamp: Number.isFinite(timestamp) ? timestamp : Date.now()
  };
}

function normalizeNumber(value: number | string | null) {
  if (value === null || value === "") {
    return null;
  }
  const parsed = typeof value === "number" ? value : Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function nextMonthIso(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  if (!Number.isFinite(year) || !Number.isFinite(monthNumber)) {
    return new Date().toISOString();
  }
  return new Date(Date.UTC(year, monthNumber, 1)).toISOString();
}
