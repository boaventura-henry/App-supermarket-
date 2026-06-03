/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_USE_REMOTE_LISTS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
