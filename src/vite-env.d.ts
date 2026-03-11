/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string
  readonly VITE_SOCKET_URL?: string
  readonly VITE_USE_SOCKET_MOCK?: string
  readonly VITE_ENABLE_DEMO_MOCK?: string
  readonly VITE_ALLOW_ALL_MOCK_TURNS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
