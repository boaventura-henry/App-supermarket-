import type { User, UserProfile } from "../types";
import { requireSupabaseClient } from "../lib/supabaseClient";

export type ProfileIdentity = Pick<User, "uid" | "email" | "name">;

type RemoteProfile = {
  id: string;
  email: string;
  name: string;
  avatar_url?: string | null;
  avatar_path?: string | null;
};

const profileSelect = "id, email, name, avatar_url, avatar_path";
const fallbackProfileSelect = "id, email, name";
const profilePhotoBucket = "profile-photos";
const maxAvatarBytes = 5 * 1024 * 1024;
const acceptedAvatarTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function getProfile(identity: ProfileIdentity): Promise<UserProfile> {
  const supabase = requireSupabaseClient();
  const { data, error } = await supabase.from("profiles").select(profileSelect).eq("id", identity.uid).maybeSingle();

  if (error && isMissingAvatarColumn(error.message)) {
    return getProfileWithoutAvatar(identity);
  }

  if (error) {
    throw new Error(`Nao foi possivel carregar o perfil: ${error.message}`);
  }

  return toUserProfile((data as RemoteProfile | null) ?? fallbackProfile(identity));
}

export async function updateProfile(identity: ProfileIdentity, payload: { name: string }): Promise<UserProfile> {
  const name = payload.name.trim();
  if (!name) {
    throw new Error("Informe o nome do perfil.");
  }

  const supabase = requireSupabaseClient();
  const { data, error } = await supabase
    .from("profiles")
    .update({ name, updated_at: new Date().toISOString() })
    .eq("id", identity.uid)
    .select(profileSelect)
    .single();

  if (error && isMissingAvatarColumn(error.message)) {
    const fallback = await updateProfileWithoutAvatar(identity, name);
    return fallback;
  }

  if (error) {
    throw new Error(`Nao foi possivel salvar o perfil: ${error.message}`);
  }

  return toUserProfile(data as RemoteProfile);
}

export async function uploadProfilePhoto(identity: ProfileIdentity, file: File): Promise<UserProfile> {
  validateAvatarFile(file);
  const supabase = requireSupabaseClient();
  const extension = getAvatarExtension(file);
  const avatarPath = `profiles/${identity.uid}/avatar.${extension}`;

  const { error: uploadError } = await supabase.storage.from(profilePhotoBucket).upload(avatarPath, file, {
    cacheControl: "3600",
    contentType: file.type,
    upsert: true
  });

  if (uploadError) {
    throw new Error(`Nao foi possivel enviar a foto. Verifique o bucket ${profilePhotoBucket}.`);
  }

  const {
    data: { publicUrl }
  } = supabase.storage.from(profilePhotoBucket).getPublicUrl(avatarPath);

  const { data, error } = await supabase
    .from("profiles")
    .update({
      avatar_path: avatarPath,
      avatar_url: publicUrl,
      updated_at: new Date().toISOString()
    })
    .eq("id", identity.uid)
    .select(profileSelect)
    .single();

  if (error) {
    throw new Error(`Foto enviada, mas nao foi possivel atualizar o perfil: ${error.message}`);
  }

  return toUserProfile(data as RemoteProfile);
}

export async function changePassword(identity: ProfileIdentity, currentPassword: string, newPassword: string) {
  if (!currentPassword.trim()) {
    throw new Error("Informe sua senha atual.");
  }
  if (newPassword.length < 6) {
    throw new Error("A nova senha deve ter pelo menos 6 caracteres.");
  }

  const supabase = requireSupabaseClient();
  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: identity.email,
    password: currentPassword
  });

  if (reauthError) {
    throw new Error("Senha atual incorreta. Confirme a senha e tente novamente.");
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) {
    throw new Error(getPasswordUpdateMessage(error.message));
  }
}

function validateAvatarFile(file: File) {
  if (!acceptedAvatarTypes.has(file.type)) {
    throw new Error("Use uma imagem JPG, PNG ou WEBP.");
  }
  if (file.size > maxAvatarBytes) {
    throw new Error("A foto deve ter no maximo 5 MB.");
  }
}

function getAvatarExtension(file: File) {
  if (file.type === "image/png") {
    return "png";
  }
  if (file.type === "image/webp") {
    return "webp";
  }
  return "jpg";
}

async function getProfileWithoutAvatar(identity: ProfileIdentity) {
  const supabase = requireSupabaseClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(fallbackProfileSelect)
    .eq("id", identity.uid)
    .maybeSingle();

  if (error) {
    throw new Error(`Nao foi possivel carregar o perfil: ${error.message}`);
  }

  return toUserProfile((data as RemoteProfile | null) ?? fallbackProfile(identity));
}

async function updateProfileWithoutAvatar(identity: ProfileIdentity, name: string) {
  const supabase = requireSupabaseClient();
  const { data, error } = await supabase
    .from("profiles")
    .update({ name, updated_at: new Date().toISOString() })
    .eq("id", identity.uid)
    .select(fallbackProfileSelect)
    .single();

  if (error) {
    throw new Error(`Nao foi possivel salvar o perfil: ${error.message}`);
  }

  return toUserProfile(data as RemoteProfile);
}

function fallbackProfile(identity: ProfileIdentity): RemoteProfile {
  return {
    id: identity.uid,
    email: identity.email,
    name: identity.name
  };
}

function toUserProfile(profile: RemoteProfile): UserProfile {
  return {
    id: profile.id,
    email: profile.email,
    name: profile.name,
    avatarUrl: profile.avatar_url ?? undefined,
    avatarPath: profile.avatar_path ?? undefined
  };
}

function isMissingAvatarColumn(message: string) {
  return message.includes("avatar_url") || message.includes("avatar_path");
}

function getPasswordUpdateMessage(message: string) {
  const normalized = message.toLowerCase();
  if (normalized.includes("weak") || normalized.includes("password")) {
    return "A nova senha foi rejeitada. Use uma senha mais forte.";
  }
  return "Nao foi possivel alterar a senha agora.";
}
