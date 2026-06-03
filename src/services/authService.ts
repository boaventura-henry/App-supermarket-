import type { AuthChangeEvent, Session, User as SupabaseUser } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";

export const USE_SUPABASE_AUTH = import.meta.env.VITE_USE_SUPABASE_AUTH === "true";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  createdAt: string;
};

type AuthMetadata = {
  name?: string;
};

function requireClient() {
  if (!supabase || !isSupabaseConfigured) {
    throw new Error("Supabase Auth nao esta configurado.");
  }

  return supabase;
}

export async function signUp(email: string, password: string, metadata: AuthMetadata = {}) {
  const client = requireClient();
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: {
      data: metadata
    }
  });

  if (error) {
    throw new Error(error.message);
  }

  return data.user ? toAuthUser(data.user) : null;
}

export async function signIn(email: string, password: string) {
  const client = requireClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) {
    throw new Error(error.message);
  }

  return data.user ? toAuthUser(data.user) : null;
}

export async function signOut() {
  const client = requireClient();
  const { error } = await client.auth.signOut();
  if (error) {
    throw new Error(error.message);
  }
}

export async function getCurrentSession() {
  const client = requireClient();
  const { data, error } = await client.auth.getSession();
  if (error) {
    throw new Error(error.message);
  }

  return data.session;
}

export async function getCurrentUser() {
  const client = requireClient();
  const { data, error } = await client.auth.getUser();
  if (error) {
    throw new Error(error.message);
  }

  return data.user ? toAuthUser(data.user) : null;
}

export async function resetPassword(email: string) {
  const client = requireClient();
  const { error } = await client.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin
  });
  if (error) {
    throw new Error(error.message);
  }
}

export function onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void) {
  const client = requireClient();
  return client.auth.onAuthStateChange(callback);
}

export async function getAccessToken() {
  if (!USE_SUPABASE_AUTH || !supabase) {
    return null;
  }

  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export function toAuthUser(user: SupabaseUser): AuthUser {
  return {
    id: user.id,
    email: user.email ?? "",
    name: typeof user.user_metadata?.name === "string" ? user.user_metadata.name : user.email ?? "Usuario",
    createdAt: user.created_at
  };
}
