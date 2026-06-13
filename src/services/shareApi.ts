import type { ListShare, Product, SharePermission, ShoppingList, User, UserProfile } from "../types";
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

type RemoteList = {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
  updated_at: string;
};

type RemoteProduct = {
  id: string;
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

const shareSelect =
  "id, list_id, owner_user_id, shared_user_id, permission, created_at, updated_at, shared_user:profiles!list_shares_shared_user_id_fkey(id, email, name, avatar_url, avatar_path)";
const fallbackShareSelect =
  "id, list_id, owner_user_id, shared_user_id, permission, created_at, updated_at, shared_user:profiles!list_shares_shared_user_id_fkey(id, email, name)";
const sharedListsSelect =
  "id, list_id, owner_user_id, shared_user_id, permission, created_at, updated_at, owner:profiles!list_shares_owner_user_id_fkey(id, email, name, avatar_url, avatar_path), list:shopping_lists(id, user_id, name, color, created_at, updated_at)";
const fallbackSharedListsSelect =
  "id, list_id, owner_user_id, shared_user_id, permission, created_at, updated_at, owner:profiles!list_shares_owner_user_id_fkey(id, email, name), list:shopping_lists(id, user_id, name, color, created_at, updated_at)";
const productSelect =
  "id, user_id, list_id, name, brand, quantity, unit_price, supermarket, purchased, sort_order, created_at, updated_at";
const listSelect = "id, user_id, name, color, created_at, updated_at";

export type CopyListResult = {
  list: ShoppingList;
  products: Product[];
  shares: ListShare[];
  copiedProducts: number;
  copiedShares: number;
};

export type ApplySharesResult = {
  updatedLists: number;
  createdShares: number;
  updatedShares: number;
  ignoredUsers: number;
};

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

export async function copyListWithItemsAndShares(listId: string, identity: ShareIdentity): Promise<CopyListResult> {
  const supabase = requireSupabaseClient();
  const now = new Date().toISOString();
  const { data: sourceList, error: sourceError } = await supabase
    .from("shopping_lists")
    .select(listSelect)
    .eq("id", listId)
    .eq("user_id", identity.uid)
    .single();

  if (sourceError || !sourceList) {
    throw new Error(`Nao foi possivel copiar a lista: ${sourceError?.message ?? "lista propria nao encontrada"}`);
  }

  const { data: newList, error: newListError } = await supabase
    .from("shopping_lists")
    .insert({
      user_id: identity.uid,
      name: `${(sourceList as RemoteList).name} - Copia`,
      color: (sourceList as RemoteList).color,
      created_at: now,
      updated_at: now
    })
    .select(listSelect)
    .single();

  if (newListError || !newList) {
    throw new Error(`Nao foi possivel criar a copia da lista: ${newListError?.message ?? "erro desconhecido"}`);
  }

  const targetList = newList as RemoteList;
  const [productsResult, sharesResult] = await Promise.all([
    supabase.from("products").select(productSelect).eq("list_id", listId).order("sort_order", { ascending: true }),
    supabase.from("list_shares").select(fallbackShareSelect).eq("list_id", listId).eq("owner_user_id", identity.uid)
  ]);

  if (productsResult.error) {
    throw new Error(`Lista copiada, mas nao foi possivel carregar os produtos: ${productsResult.error.message}`);
  }
  if (sharesResult.error) {
    throw new Error(`Lista copiada, mas nao foi possivel carregar os compartilhamentos: ${sharesResult.error.message}`);
  }

  const sourceProducts = (productsResult.data ?? []) as RemoteProduct[];
  let copiedProducts: Product[] = [];
  if (sourceProducts.length > 0) {
    const { data: insertedProducts, error: productsError } = await supabase
      .from("products")
      .insert(
        sourceProducts.map((product) => ({
          user_id: identity.uid,
          list_id: targetList.id,
          name: product.name,
          brand: product.brand,
          quantity: product.quantity,
          unit_price: product.unit_price,
          supermarket: product.supermarket,
          purchased: product.purchased,
          sort_order: product.sort_order,
          created_at: now,
          updated_at: now
        }))
      )
      .select(productSelect);

    if (productsError) {
      throw new Error(`Lista copiada, mas os produtos nao foram copiados: ${productsError.message}`);
    }
    copiedProducts = ((insertedProducts ?? []) as RemoteProduct[]).map(toLocalProduct);
  }

  const uniqueShares = uniqueShareTargets((sharesResult.data ?? []) as RemoteShare[], identity.uid);
  let copiedShares: ListShare[] = [];
  if (uniqueShares.length > 0) {
    const { data: insertedShares, error: sharesError } = await supabase
      .from("list_shares")
      .upsert(
        uniqueShares.map((share) => ({
          list_id: targetList.id,
          owner_user_id: identity.uid,
          shared_user_id: share.shared_user_id,
          permission: share.permission,
          created_at: now,
          updated_at: now
        })),
        { onConflict: "list_id,shared_user_id" }
      )
      .select(fallbackShareSelect);

    if (sharesError) {
      throw new Error(`Lista copiada, mas os compartilhamentos nao foram copiados: ${sharesError.message}`);
    }
    copiedShares = ((insertedShares ?? []) as RemoteShare[]).map(toLocalShare);
  }

  return {
    list: toLocalOwnedList(targetList, identity.uid),
    products: copiedProducts,
    shares: copiedShares,
    copiedProducts: copiedProducts.length,
    copiedShares: copiedShares.length
  };
}

export async function applySharesToAllMyLists(sourceListId: string, identity: ShareIdentity): Promise<ApplySharesResult> {
  const supabase = requireSupabaseClient();
  const [{ data: sourceList, error: sourceListError }, { data: sourceShares, error: sourceSharesError }, { data: lists, error: listsError }] =
    await Promise.all([
      supabase.from("shopping_lists").select("id").eq("id", sourceListId).eq("user_id", identity.uid).single(),
      supabase.from("list_shares").select(fallbackShareSelect).eq("list_id", sourceListId).eq("owner_user_id", identity.uid),
      supabase.from("shopping_lists").select("id").eq("user_id", identity.uid)
    ]);

  if (sourceListError || !sourceList) {
    throw new Error(`Lista base nao encontrada: ${sourceListError?.message ?? "lista propria obrigatoria"}`);
  }
  if (sourceSharesError) {
    throw new Error(`Nao foi possivel carregar compartilhamentos da lista base: ${sourceSharesError.message}`);
  }
  if (listsError) {
    throw new Error(`Nao foi possivel carregar suas listas: ${listsError.message}`);
  }

  const shareTemplates = uniqueShareTargets((sourceShares ?? []) as RemoteShare[], identity.uid);
  const targetListIds = ((lists ?? []) as { id: string }[])
    .map((list) => list.id)
    .filter((id) => id !== sourceListId);

  if (shareTemplates.length === 0 || targetListIds.length === 0) {
    return { updatedLists: 0, createdShares: 0, updatedShares: 0, ignoredUsers: (sourceShares ?? []).length - shareTemplates.length };
  }

  const { data: existingShares, error: existingError } = await supabase
    .from("list_shares")
    .select("id, list_id, owner_user_id, shared_user_id, permission, created_at, updated_at")
    .eq("owner_user_id", identity.uid)
    .in("list_id", targetListIds);

  if (existingError) {
    throw new Error(`Nao foi possivel validar compartilhamentos existentes: ${existingError.message}`);
  }

  const existingByTarget = new Map(
    ((existingShares ?? []) as RemoteShare[]).map((share) => [`${share.list_id}:${share.shared_user_id}`, share])
  );
  const now = new Date().toISOString();
  const rowsToUpsert: Array<{
    list_id: string;
    owner_user_id: string;
    shared_user_id: string;
    permission: SharePermission;
    updated_at: string;
  }> = [];
  let createdShares = 0;
  let updatedShares = 0;
  const touchedListIds = new Set<string>();

  for (const listId of targetListIds) {
    for (const share of shareTemplates) {
      const key = `${listId}:${share.shared_user_id}`;
      const existing = existingByTarget.get(key);
      if (existing?.permission === share.permission) {
        continue;
      }
      rowsToUpsert.push({
        list_id: listId,
        owner_user_id: identity.uid,
        shared_user_id: share.shared_user_id,
        permission: share.permission,
        updated_at: now
      });
      touchedListIds.add(listId);
      if (existing) {
        updatedShares += 1;
      } else {
        createdShares += 1;
      }
    }
  }

  if (rowsToUpsert.length > 0) {
    const { error: upsertError } = await supabase.from("list_shares").upsert(rowsToUpsert, { onConflict: "list_id,shared_user_id" });
    if (upsertError) {
      throw new Error(`Nao foi possivel aplicar compartilhamentos em massa: ${upsertError.message}`);
    }
  }

  return {
    updatedLists: touchedListIds.size,
    createdShares,
    updatedShares,
    ignoredUsers: (sourceShares ?? []).length - shareTemplates.length
  };
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

function toLocalOwnedList(list: RemoteList, userId: string): ShoppingList {
  return {
    id: list.id,
    userId,
    name: list.name,
    color: list.color,
    createdAt: Date.parse(list.created_at),
    updatedAt: Date.parse(list.updated_at)
  };
}

function toLocalProduct(product: RemoteProduct): Product {
  const timestamp = Date.parse(product.created_at);
  return {
    id: product.id,
    userId: product.user_id,
    listId: product.list_id,
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

function uniqueShareTargets(shares: RemoteShare[], currentUserId: string) {
  const unique = new Map<string, RemoteShare>();
  for (const share of shares) {
    if (!share.shared_user_id || share.shared_user_id === currentUserId) {
      continue;
    }
    unique.set(share.shared_user_id, share);
  }
  return Array.from(unique.values());
}

function normalizeNumber(value: number | string | null) {
  if (value === null) {
    return null;
  }
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function firstProfile(profile: RemoteProfile | RemoteProfile[] | null | undefined) {
  return Array.isArray(profile) ? profile[0] : profile;
}

function isMissingAvatarColumn(message: string) {
  return message.includes("avatar_url") || message.includes("avatar_path");
}
