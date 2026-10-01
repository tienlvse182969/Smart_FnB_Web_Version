/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  /** Đường dẫn Socket.IO của backend (mặc định /socket.io). */
  readonly VITE_REALTIME_PATH?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
