import type { ShoppingList, User } from "../types";
import { isSupabaseConfigured, requireSupabaseClient } from "../lib/supabaseClient";

export const USE_REMOTE_LISTS = isSupabaseConfigured;

export type RemoteShoppingList = {
  id: string;
  legacy_id?: string | null;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
  updated_at: string;
};

export type ListIdentity = Pick<User, "uid" | "email" | "name">;

export function toLocalShoppingList(list: RemoteShoppingList, localUserId = list.user_id): ShoppingList {
  return {
    id: list.id,
    userId: localUserId,
    name: list.name,
    color: list.color,
    createdAt: Date.parse(list.created_at),
    updatedAt: Date.parse(list.updated_at)
  };
}

export async function getMyLists(identity: ListIdentity) {
  const supabase = requireSupabaseClient();
  const { data, error } = await supabase
    .from("shopping_lists")
    .select("id, legacy_id, user_id, name, color, created_at, updated_at")
    .eq("user_id", identity.uid)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Nao foi possivel carregar as listas: ${error.message}`);
  }

  return ((data ?? []) as RemoteShoppingList[]).map((list) => toLocalShoppingList(list, identity.uid));
}

export const getLists = getMyLists;

export async function getList(id: string, identity: ListIdentity) {
  void identity;
  const supabase = requireSupabaseClient();
  const { data, error } = await supabase
    .from("shopping_lists")
    .select("id, legacy_id, user_id, name, color, created_at, updated_at")
    .eq("id", id)
    .single();

  if (error) {
    throw new Error(`Lista nao encontrada: ${error.message}`);
  }

  return toLocalShoppingList(data as RemoteShoppingList);
}

export async function createList(identity: ListIdentity, payload: { name: string; color: string }) {
  const supabase = requireSupabaseClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("shopping_lists")
    .insert({
      user_id: identity.uid,
      name: payload.name.trim(),
      color: payload.color,
      created_at: now,
      updated_at: now
    })
    .select("id, legacy_id, user_id, name, color, created_at, updated_at")
    .single();

  if (error) {
    throw new Error(`Nao foi possivel criar a lista: ${error.message}`);
  }

  return data as RemoteShoppingList;
}

export async function updateList(id: string, identity: ListIdentity, payload: { name: string; color: string }) {
  const supabase = requireSupabaseClient();
  const { data, error } = await supabase
    .from("shopping_lists")
    .update({
      name: payload.name.trim(),
      color: payload.color,
      updated_at: new Date().toISOString()
    })
    .eq("id", id)
    .eq("user_id", identity.uid)
    .select("id, legacy_id, user_id, name, color, created_at, updated_at")
    .single();

  if (error) {
    throw new Error(`Nao foi possivel atualizar a lista: ${error.message}`);
  }

  return data as RemoteShoppingList;
}

export async function deleteList(id: string, identity: ListIdentity) {
  const supabase = requireSupabaseClient();
  const { error } = await supabase.from("shopping_lists").delete().eq("id", id).eq("user_id", identity.uid);

  if (error) {
    throw new Error(`Nao foi possivel excluir a lista: ${error.message}`);
  }

  return { id };
}
