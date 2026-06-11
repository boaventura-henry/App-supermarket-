import type { ListShare, SharePermission, ShoppingList, User } from "../types";
import { requireSupabaseClient } from "../lib/supabaseClient";

export type ShareIdentity = Pick<User, "uid" | "email" | "name">;

type RemoteProfile = {
  id: string;
  email: string;
  name: string;
};

type RemoteShare = {
  id: string;
  list_id: string;
  owner_user_id: string;
  shared_user_id: string;
  permission: SharePermission;
  created_at: string;
  updated_at: string;
  shared_user?: RemoteProfile | RemoteProfile[] | null;
  owner?: RemoteProfile | RemoteProfile[] | null;
  list?: {
    id: string;
    user_id: string;
    name: string;
    color: string;
    created_at: string;
    updated_at: string;
  } | {
    id: string;
    user_id: string;
    name: string;
    color: string;
    created_at: string;
    updated_at: string;
  }[] | null;
};

const shareSelect =
  "id, list_id, owner_user_id, shared_user_id, permission, created_at, updated_at, shared_user:profiles!list_shares_shared_user_id_fkey(id, email, name)";

export async function findProfileByEmail(email: string) {
  const supabase = requireSupabaseClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, name")
    .eq("email", email.trim().toLowerCase())
    .maybeSingle();

  if (error) {
    throw new Error(`Nao foi possivel pesquisar usuario: ${error.message}`);
  }

  return data as RemoteProfile | null;
}

export async function getListShares(listId: string, identity: ShareIdentity) {
  const supabase = requireSupabaseClient();
  const { data, error } = await supabase
    .from("list_shares")
    .select(shareSelect)
    .eq("list_id", listId)
    .eq("owner_user_id", identity.uid)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Nao foi possivel carregar compartilhamentos: ${error.message}`);
  }

  return ((data ?? []) as RemoteShare[]).map(toLocalShare);
}

export async function shareListWithUser(
  listId: string,
  identity: ShareIdentity,
  sharedUserId: string,
  permission: SharePermission
) {
  if (sharedUserId === identity.uid) {
    throw new Error("Voce ja e o dono desta lista.");
  }

  const supabase = requireSupabaseClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("list_shares")
    .upsert(
      {
        list_id: listId,
        owner_user_id: identity.uid,
        shared_user_id: sharedUserId,
        permission,
        updated_at: now
      },
      { onConflict: "list_id,shared_user_id" }
    )
    .select(shareSelect)
    .single();

  if (error) {
    throw new Error(`Nao foi possivel compartilhar a lista: ${error.message}`);
  }

  return toLocalShare(data as RemoteShare);
}

export async function updateListSharePermission(shareId: string, identity: ShareIdentity, permission: SharePermission) {
  const supabase = requireSupabaseClient();
  const { data, error } = await supabase
    .from("list_shares")
    .update({ permission, updated_at: new Date().toISOString() })
    .eq("id", shareId)
    .eq("owner_user_id", identity.uid)
    .select(shareSelect)
    .single();

  if (error) {
    throw new Error(`Nao foi possivel atualizar permissao: ${error.message}`);
  }

  return toLocalShare(data as RemoteShare);
}

export async function removeListShare(shareId: string, identity: ShareIdentity) {
  const supabase = requireSupabaseClient();
  const { error } = await supabase.from("list_shares").delete().eq("id", shareId).eq("owner_user_id", identity.uid);

  if (error) {
    throw new Error(`Nao foi possivel remover compartilhamento: ${error.message}`);
  }

  return { id: shareId };
}

export async function getSharedLists(identity: ShareIdentity) {
  const supabase = requireSupabaseClient();
  const { data, error } = await supabase
    .from("list_shares")
    .select(
      "id, list_id, owner_user_id, shared_user_id, permission, created_at, updated_at, owner:profiles!list_shares_owner_user_id_fkey(id, email, name), list:shopping_lists(id, user_id, name, color, created_at, updated_at)"
    )
    .eq("shared_user_id", identity.uid)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Nao foi possivel carregar listas compartilhadas: ${error.message}`);
  }

  return ((data ?? []) as RemoteShare[])
    .filter((share) => Boolean(share.list))
    .map((share) => toSharedShoppingList(share));
}

function toLocalShare(share: RemoteShare): ListShare {
  const profile = firstProfile(share.shared_user);
  return {
    id: share.id,
    listId: share.list_id,
    ownerUserId: share.owner_user_id,
    sharedUserId: share.shared_user_id,
    sharedUserEmail: profile?.email ?? "",
    sharedUserName: profile?.name ?? "Usuario compartilhado",
    permission: share.permission,
    createdAt: Date.parse(share.created_at),
    updatedAt: Date.parse(share.updated_at)
  };
}

function toSharedShoppingList(share: RemoteShare): ShoppingList {
  const owner = firstProfile(share.owner);
  const list = Array.isArray(share.list) ? share.list[0] : share.list!;
  return {
    id: list.id,
    userId: list.user_id,
    name: list.name,
    color: list.color,
    createdAt: Date.parse(list.created_at),
    updatedAt: Date.parse(list.updated_at),
    sharedPermission: share.permission,
    ownerName: owner?.name,
    ownerEmail: owner?.email
  };
}

function firstProfile(profile: RemoteProfile | RemoteProfile[] | null | undefined) {
  return Array.isArray(profile) ? profile[0] : profile;
}
