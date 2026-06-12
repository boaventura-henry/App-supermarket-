import type { ListShare, SharePermission, ShoppingList, User, UserProfile } from "../types";
import { requireSupabaseClient } from "../lib/supabaseClient";

export type ShareIdentity = Pick<User, "uid" | "email" | "name">;

type RemoteProfile = {
  id: string;
  email: string;
  name: string;
  avatar_url?: string | null;
  avatar_path?: string | null;
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
  "id, list_id, owner_user_id, shared_user_id, permission, created_at, updated_at, shared_user:profiles!list_shares_shared_user_id_fkey(id, email, name, avatar_url, avatar_path)";
const fallbackShareSelect =
  "id, list_id, owner_user_id, shared_user_id, permission, created_at, updated_at, shared_user:profiles!list_shares_shared_user_id_fkey(id, email, name)";
const sharedListsSelect =
  "id, list_id, owner_user_id, shared_user_id, permission, created_at, updated_at, owner:profiles!list_shares_owner_user_id_fkey(id, email, name, avatar_url, avatar_path), list:shopping_lists(id, user_id, name, color, created_at, updated_at)";
const fallbackSharedListsSelect =
  "id, list_id, owner_user_id, shared_user_id, permission, created_at, updated_at, owner:profiles!list_shares_owner_user_id_fkey(id, email, name), list:shopping_lists(id, user_id, name, color, created_at, updated_at)";

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

export async function getShareableProfiles(identity: ShareIdentity): Promise<UserProfile[]> {
  const supabase = requireSupabaseClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, name, avatar_url, avatar_path")
    .neq("id", identity.uid)
    .order("name", { ascending: true });

  if (error && isMissingAvatarColumn(error.message)) {
    const fallback = await supabase
      .from("profiles")
      .select("id, email, name")
      .neq("id", identity.uid)
      .order("name", { ascending: true });

    if (fallback.error) {
      throw new Error(`Nao foi possivel carregar usuarios: ${fallback.error.message}`);
    }

    return mapProfiles((fallback.data ?? []) as RemoteProfile[], identity.uid);
  }

  if (error) {
    throw new Error(`Nao foi possivel carregar usuarios: ${error.message}`);
  }

  return mapProfiles((data ?? []) as RemoteProfile[], identity.uid);
}

function mapProfiles(profiles: RemoteProfile[], currentUserId: string): UserProfile[] {
  return profiles
    .filter((profile) => Boolean(profile.id) && profile.id !== currentUserId)
    .map((profile) => ({
      id: profile.id,
      email: profile.email ?? "",
      name: profile.name || profile.email?.split("@")[0] || "Usuario",
      avatarUrl: profile.avatar_url ?? undefined,
      avatarPath: profile.avatar_path ?? undefined
    }));
}

export async function getListShares(listId: string, identity: ShareIdentity) {
  const supabase = requireSupabaseClient();
  const { data, error } = await supabase
    .from("list_shares")
    .select(shareSelect)
    .eq("list_id", listId)
    .eq("owner_user_id", identity.uid)
    .order("created_at", { ascending: true });

  if (error && isMissingAvatarColumn(error.message)) {
    const fallback = await supabase
      .from("list_shares")
      .select(fallbackShareSelect)
      .eq("list_id", listId)
      .eq("owner_user_id", identity.uid)
      .order("created_at", { ascending: true });

    if (fallback.error) {
      throw new Error(`Nao foi possivel carregar compartilhamentos: ${fallback.error.message}`);
    }

    return ((fallback.data ?? []) as RemoteShare[]).map(toLocalShare);
  }

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
    .select(fallbackShareSelect)
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
    .select(fallbackShareSelect)
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
    .select(sharedListsSelect)
    .eq("shared_user_id", identity.uid)
    .order("created_at", { ascending: true });

  if (error && isMissingAvatarColumn(error.message)) {
    const fallback = await supabase
      .from("list_shares")
      .select(fallbackSharedListsSelect)
      .eq("shared_user_id", identity.uid)
      .order("created_at", { ascending: true });

    if (fallback.error) {
      throw new Error(`Nao foi possivel carregar listas compartilhadas: ${fallback.error.message}`);
    }

    return ((fallback.data ?? []) as RemoteShare[])
      .filter((share) => Boolean(share.list))
      .map((share) => toSharedShoppingList(share));
  }

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
    sharedUserAvatarUrl: profile?.avatar_url ?? undefined,
    sharedUserAvatarPath: profile?.avatar_path ?? undefined,
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
    ownerEmail: owner?.email,
    ownerAvatarUrl: owner?.avatar_url ?? undefined,
    ownerAvatarPath: owner?.avatar_path ?? undefined
  };
}

function firstProfile(profile: RemoteProfile | RemoteProfile[] | null | undefined) {
  return Array.isArray(profile) ? profile[0] : profile;
}

function isMissingAvatarColumn(message: string) {
  return message.includes("avatar_url") || message.includes("avatar_path");
}
