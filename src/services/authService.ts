import type { AuthChangeEvent, AuthError, Session, User as SupabaseUser } from "@supabase/supabase-js";
import type { User } from "../types";
import { isSupabaseConfigured, requireSupabaseClient } from "../lib/supabaseClient";

export { isSupabaseConfigured };

export type AuthOperation =
  | "getCurrentSession"
  | "getCurrentUser"
  | "signUp"
  | "signIn"
  | "signOut"
  | "resetPassword"
  | "ensureProfile";

export type AuthDiagnostic = {
  operation: AuthOperation;
  message: string;
  supabaseMessage?: string;
  code?: string;
  details?: string;
  hint?: string;
};

type SupabaseErrorLike = {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
};

export function toLocalUser(user: SupabaseUser, fallbackName?: string): User {
  const metadataName = typeof user.user_metadata?.name === "string" ? user.user_metadata.name : "";
  const emailName = user.email?.split("@")[0] ?? "Usuario";
  return {
    uid: user.id,
    name: fallbackName?.trim() || metadataName || emailName,
    email: user.email?.trim().toLowerCase() ?? "",
    authProvider: "supabase",
    createdAt: user.created_at ? new Date(user.created_at).getTime() : Date.now()
  };
}

export function requireSupabaseConfigured() {
  if (!isSupabaseConfigured) {
    throw createAuthError(
      "getCurrentSession",
      "Supabase nao configurado. Verifique VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY na Vercel."
    );
  }
}

export async function getCurrentSession() {
  requireSupabaseConfigured();
  const supabase = requireSupabaseClient();
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw toAuthError("getCurrentSession", error);
  }
  return data.session;
}

export async function getCurrentUser() {
  const session = await getCurrentSession();
  if (!session?.user) {
    return null;
  }
  await ensureProfile(session.user);
  return toLocalUser(session.user);
}

export function onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void) {
  requireSupabaseConfigured();
  const supabase = requireSupabaseClient();
  return supabase.auth.onAuthStateChange(callback);
}

export async function signUp(name: string, email: string, password: string) {
  requireSupabaseConfigured();
  const supabase = requireSupabaseClient();
  const { data, error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: {
      data: {
        name: name.trim()
      }
    }
  });

  if (error || !data.user) {
    throw toAuthError("signUp", error, "Nao foi possivel criar sua conta no Supabase.");
  }

  // If e-mail confirmation is enabled, Supabase creates the Auth user but does not
  // provide an authenticated session yet. The profile will be created on first login.
  if (!data.session) {
    return {
      user: toLocalUser(data.user, name),
      needsEmailConfirmation: true
    };
  }

  const profile = await ensureProfile(data.user, name);
  return {
    user: profile,
    needsEmailConfirmation: false
  };
}

export async function signIn(email: string, password: string) {
  requireSupabaseConfigured();
  const supabase = requireSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password
  });

  if (error || !data.user) {
    throw toAuthError("signIn", error, "Nao foi possivel entrar com Supabase Auth.");
  }

  return ensureProfile(data.user);
}

export async function signOut() {
  if (!isSupabaseConfigured) {
    return;
  }
  const supabase = requireSupabaseClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw toAuthError("signOut", error);
  }
}

export async function sendPasswordReset(email: string) {
  requireSupabaseConfigured();
  const supabase = requireSupabaseClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo: window.location.origin
  });

  if (error) {
    throw toAuthError("resetPassword", error);
  }
}

export async function ensureProfile(user: SupabaseUser, fallbackName?: string) {
  requireSupabaseConfigured();
  const supabase = requireSupabaseClient();
  const profile = toLocalUser(user, fallbackName);
  const now = new Date().toISOString();
  const { error } = await supabase.from("profiles").upsert(
    {
      id: profile.uid,
      email: profile.email,
      name: profile.name,
      updated_at: now
    },
    { onConflict: "id" }
  );

  if (error) {
    throw toAuthError("ensureProfile", error, "Nao foi possivel criar/atualizar o profile do usuario.");
  }

  return profile;
}

export function getAuthDiagnostic(error: unknown): AuthDiagnostic {
  if (isAuthDiagnostic(error)) {
    return error.diagnostic;
  }
  if (error instanceof Error) {
    return {
      operation: "getCurrentSession",
      message: error.message
    };
  }
  return {
    operation: "getCurrentSession",
    message: "Erro inesperado no Supabase Auth."
  };
}

export function logAuthError(error: unknown) {
  const diagnostic = getAuthDiagnostic(error);
  console.error("Supabase Auth error", {
    operation: diagnostic.operation,
    message: diagnostic.message,
    supabaseMessage: diagnostic.supabaseMessage,
    code: diagnostic.code,
    details: diagnostic.details,
    hint: diagnostic.hint
  });
}

function toAuthError(operation: AuthOperation, error?: SupabaseErrorLike | AuthError | null, fallback?: string) {
  return createAuthError(operation, getFriendlyAuthMessage(operation, error, fallback), error ?? undefined);
}

function createAuthError(operation: AuthOperation, message: string, error?: SupabaseErrorLike) {
  const authError = new Error(message) as Error & { diagnostic: AuthDiagnostic };
  authError.diagnostic = {
    operation,
    message,
    supabaseMessage: error?.message,
    code: error?.code,
    details: error?.details,
    hint: error?.hint
  };
  return authError;
}

function getFriendlyAuthMessage(operation: AuthOperation, error?: SupabaseErrorLike | AuthError | null, fallback?: string) {
  const rawMessage = error?.message?.trim() ?? "";
  const normalized = rawMessage.toLowerCase();
  const code = "code" in (error ?? {}) ? (error as SupabaseErrorLike).code?.toLowerCase() : "";

  if (!rawMessage) {
    return fallback || "Nao foi possivel concluir a autenticacao.";
  }

  if (operation === "signIn") {
    if (code === "email_not_confirmed" || normalized.includes("email not confirmed") || normalized.includes("not confirmed")) {
      return "E-mail ainda nao confirmado. Verifique sua caixa de entrada antes de entrar.";
    }
    if (
      code === "invalid_credentials" ||
      normalized.includes("invalid login credentials") ||
      normalized.includes("invalid credentials")
    ) {
      return "E-mail ou senha incorretos. Confirme os dados ou crie uma conta antes de entrar.";
    }
    if (normalized.includes("network") || normalized.includes("failed to fetch")) {
      return "Nao foi possivel conectar ao Supabase. Verifique sua conexao e tente novamente.";
    }
    return fallback || rawMessage;
  }

  if (operation === "signUp") {
    if (
      code === "user_already_exists" ||
      normalized.includes("already registered") ||
      normalized.includes("already exists") ||
      normalized.includes("user already registered")
    ) {
      return "Ja existe uma conta com este e-mail. Entre com sua senha ou recupere o acesso.";
    }
    if (normalized.includes("password") && normalized.includes("characters")) {
      return "A senha nao atende aos requisitos minimos do Supabase.";
    }
    return fallback || rawMessage;
  }

  if (operation === "resetPassword") {
    if (normalized.includes("rate limit")) {
      return "Muitas tentativas de recuperacao. Aguarde alguns minutos e tente novamente.";
    }
    return fallback || rawMessage;
  }

  return fallback || rawMessage;
}

function isAuthDiagnostic(error: unknown): error is Error & { diagnostic: AuthDiagnostic } {
  return error instanceof Error && "diagnostic" in error;
}
