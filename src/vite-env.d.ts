/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_DEBUG_SUPABASE?: string;
  readonly VITE_ENABLE_LOCAL_FALLBACK?: string;
  readonly VITE_USE_REMOTE_LISTS?: string;
  readonly VITE_USE_REMOTE_PRODUCTS?: string;
  readonly VITE_USE_REMOTE_PRICE_HISTORY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
