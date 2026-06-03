/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_USE_REMOTE_LISTS?: string;
  readonly VITE_USE_REMOTE_PRODUCTS?: string;
  readonly VITE_USE_REMOTE_PRICE_HISTORY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
