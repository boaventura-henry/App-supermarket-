import { createClient } from "@supabase/supabase-js";
import type { ApiRequest } from "../../../api/_utils";
import { AppError } from "../errors";

export type AuthenticatedUser = {
  id: string;
  email: string;
  name: string;
};

let cachedClient: ReturnType<typeof createClient> | null = null;

function getSupabaseAuthClient() {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new AppError(500, "Supabase Auth nao esta configurado no backend.");
  }

  cachedClient ??= createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  return cachedClient;
}

export async function getAuthenticatedUser(request: ApiRequest): Promise<AuthenticatedUser> {
  const authorization = getHeader(request, "authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice("Bearer ".length).trim() : "";

  if (!token) {
    throw new AppError(401, "Sessao expirada ou ausente.");
  }

  const { data, error } = await getSupabaseAuthClient().auth.getUser(token);
  if (error || !data.user) {
    throw new AppError(401, "Token Supabase invalido.");
  }

  return {
    id: data.user.id,
    email: data.user.email ?? "",
    name: typeof data.user.user_metadata?.name === "string" ? data.user.user_metadata.name : data.user.email ?? "Usuario"
  };
}

export async function getAuthenticatedUserOrNull(request: ApiRequest) {
  const authorization = getHeader(request, "authorization");
  if (!authorization) {
    return null;
  }

  return getAuthenticatedUser(request);
}

function getHeader(request: ApiRequest, name: string) {
  const value = request.headers?.[name] ?? request.headers?.[name.toLowerCase()] ?? request.headers?.[name.toUpperCase()];
  return Array.isArray(value) ? value[0] : value;
}
