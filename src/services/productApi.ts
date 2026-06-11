import type { Product, User } from "../types";
import { isSupabaseConfigured, requireSupabaseClient } from "../lib/supabaseClient";

export const USE_REMOTE_PRODUCTS = isSupabaseConfigured;

export type RemoteProduct = {
  id: string;
  legacy_id?: string | null;
  user_id: string;
  list_id: string;
  name: string;
  brand: string | null;
  quantity: number | string | null;
  unit_price: number | string | null;
  supermarket: string | null;
  purchased: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type ProductPayload = {
  name?: string;
  brand?: string;
  quantity?: number | string | null;
  unitPrice?: number | string | null;
  supermarket?: string;
};

export type ProductIdentity = Pick<User, "uid" | "email" | "name">;

const productSelect =
  "id, legacy_id, user_id, list_id, name, brand, quantity, unit_price, supermarket, purchased, sort_order, created_at, updated_at";

export async function getProducts(listId: string, identity: ProductIdentity) {
  const supabase = requireSupabaseClient();
  const { data, error } = await supabase
    .from("products")
    .select(productSelect)
    .eq("list_id", listId)
    .order("purchased", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Nao foi possivel carregar produtos: ${error.message}`);
  }

  return ((data ?? []) as RemoteProduct[]).map((product) => toLocalProduct(product, identity.uid, listId));
}

export async function createProduct(listId: string, identity: ProductIdentity, payload: ProductPayload) {
  const supabase = requireSupabaseClient();
  const listOwnerId = await getListOwnerId(listId);
  const now = new Date().toISOString();
  const nextSortOrder = await getNextSortOrder(listId);
  const insertPayload = {
    list_id: listId,
    user_id: listOwnerId,
    name: payload.name?.trim() ?? "",
    brand: payload.brand?.trim() || null,
    quantity: normalizeDecimalPayload(payload.quantity),
    unit_price: normalizeDecimalPayload(payload.unitPrice),
    supermarket: payload.supermarket?.trim() || null,
    purchased: false,
    sort_order: nextSortOrder,
    created_at: now,
    updated_at: now
  };

  const { data, error } = await supabase.from("products").insert(insertPayload).select(productSelect).single();

  if (error) {
    throw new Error(`Nao foi possivel criar o produto: ${error.message}`);
  }

  const product = data as RemoteProduct;
  await createHistoryForValidPrice(product);
  return toLocalProduct(product, identity.uid, listId);
}

export async function updateProduct(id: string, identity: ProductIdentity, payload: ProductPayload) {
  const supabase = requireSupabaseClient();
  const before = await getAccessibleProduct(id);
  const updatePayload = {
    ...(payload.brand !== undefined ? { brand: payload.brand.trim() || null } : {}),
    ...(payload.quantity !== undefined ? { quantity: normalizeDecimalPayload(payload.quantity) } : {}),
    ...(payload.unitPrice !== undefined ? { unit_price: normalizeDecimalPayload(payload.unitPrice) } : {}),
    ...(payload.supermarket !== undefined ? { supermarket: payload.supermarket.trim() || null } : {}),
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from("products")
    .update(updatePayload)
    .eq("id", id)
    .select(productSelect)
    .single();

  if (error) {
    throw new Error(`Nao foi possivel atualizar o produto: ${error.message}`);
  }

  const product = data as RemoteProduct;
  const previousPrice = normalizeNumber(before.unit_price);
  const nextPrice = normalizeNumber(product.unit_price);
  if (nextPrice !== null && nextPrice > 0 && nextPrice !== previousPrice) {
    await createHistoryForValidPrice(product);
  }
  return toLocalProduct(product, identity.uid);
}

export async function deleteProduct(id: string, identity: ProductIdentity) {
  void identity;
  const supabase = requireSupabaseClient();
  const { error } = await supabase.from("products").delete().eq("id", id);

  if (error) {
    throw new Error(`Nao foi possivel excluir o produto: ${error.message}`);
  }

  return { id };
}

export async function togglePurchased(id: string, identity: ProductIdentity, purchased: boolean) {
  void identity;
  const supabase = requireSupabaseClient();
  const { data, error } = await supabase
    .from("products")
    .update({ purchased, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select(productSelect)
    .single();

  if (error) {
    throw new Error(`Nao foi possivel atualizar o status do produto: ${error.message}`);
  }

  return toLocalProduct(data as RemoteProduct, identity.uid);
}

async function getAccessibleProduct(id: string) {
  const supabase = requireSupabaseClient();
  const { data, error } = await supabase.from("products").select(productSelect).eq("id", id).single();
  if (error) {
    throw new Error(`Produto nao encontrado: ${error.message}`);
  }
  return data as RemoteProduct;
}

async function getNextSortOrder(listId: string) {
  const supabase = requireSupabaseClient();
  const { data, error } = await supabase
    .from("products")
    .select("sort_order")
    .eq("list_id", listId)
    .order("sort_order", { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(`Nao foi possivel calcular a ordem do produto: ${error.message}`);
  }

  const currentMax = Number(data?.[0]?.sort_order);
  return Number.isFinite(currentMax) ? currentMax + 1 : 0;
}

async function getListOwnerId(listId: string) {
  const supabase = requireSupabaseClient();
  const { data, error } = await supabase.from("shopping_lists").select("user_id").eq("id", listId).single();
  if (error || !data?.user_id) {
    throw new Error(`Nao foi possivel validar a lista: ${error?.message ?? "lista nao encontrada"}`);
  }
  return data.user_id as string;
}

async function createHistoryForValidPrice(product: RemoteProduct) {
  const price = normalizeNumber(product.unit_price);
  if (price === null || price <= 0) {
    return;
  }

  const supabase = requireSupabaseClient();
  const { error } = await supabase.from("price_history").insert({
    user_id: product.user_id,
    list_id: product.list_id,
    product_id: product.id,
    product_name: product.name,
    brand: product.brand || null,
    supermarket: product.supermarket || null,
    quantity: normalizeDecimalPayload(product.quantity),
    price,
    created_at: new Date().toISOString()
  });

  if (error) {
    throw new Error(`Produto salvo, mas o historico de preco falhou: ${error.message}`);
  }
}

function toLocalProduct(product: RemoteProduct, fallbackUserId: string, fallbackListId?: string): Product {
  const timestamp = Date.parse(product.created_at);
  return {
    id: product.id,
    userId: product.user_id || fallbackUserId,
    listId: product.list_id || fallbackListId || "",
    name: product.name,
    brand: product.brand ?? "",
    quantity: normalizeNumber(product.quantity),
    unitPrice: normalizeNumber(product.unit_price),
    supermarket: product.supermarket ?? "",
    timestamp: Number.isFinite(timestamp) ? timestamp : Date.now(),
    isBought: product.purchased,
    sortOrder: Number.isFinite(product.sort_order) ? product.sort_order : 0
  };
}

function normalizeDecimalPayload(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const parsed = typeof value === "number" ? value : Number(value.replace(",", "."));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function normalizeNumber(value: number | string | null) {
  if (value === null) {
    return null;
  }
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
