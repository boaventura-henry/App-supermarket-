/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_USE_REMOTE_LISTS?: string;
  readonly VITE_USE_REMOTE_PRODUCTS?: string;
  readonly VITE_USE_REMOTE_PRICE_HISTORY?: string;
  readonly VITE_ENABLE_LOCAL_DATA_MIGRATION?: string;
  readonly VITE_USE_SUPABASE_AUTH?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
