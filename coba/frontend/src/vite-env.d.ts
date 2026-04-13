/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BUILD_NUMBER?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare const __GIT_HASH__: string
