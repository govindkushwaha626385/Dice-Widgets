export {};

declare global {
  interface Window {
    electronAPI?: {
      invoke: (channel: string, data?: unknown) => Promise<unknown>;
      fetch: (url: string, options?: { method?: string; headers?: Record<string, string>; body?: string }) => Promise<{
        ok: boolean;
        status: number;
        statusText: string;
        headers: Record<string, string>;
        body: string;
      }>;
      openExternal: (url: string) => Promise<void>;
      openInWindow?: (url: string, title: string) => Promise<void>;
      closeWindow?: () => Promise<void>;
      notify: (title: string, body?: string) => Promise<void>;
      whatsapp?: {
        init: () => Promise<{ status: string; qr?: string; error?: string }>;
        getStatus: () => Promise<{ status: string; qr?: string }>;
        getChats: () => Promise<{ ok: boolean; chats?: WhatsAppChat[]; error?: string }>;
        getMessages: (chatId: string, limit?: number) => Promise<{ ok: boolean; messages?: WhatsAppMessage[]; error?: string }>;
        reset: () => Promise<void>;
        on: (channel: string, callback: (...args: unknown[]) => void) => () => void;
      };
      diceAuth?: {
        getStatus: () => Promise<{ hasAuth: boolean }>;
        openLogin: () => Promise<void>;
        onWindowOpened?: (callback: () => void) => () => void;
        onSaved?: (callback: (path?: string) => void) => () => void;
        onError?: (callback: (message: string) => void) => () => void;
      };
    };
  }
}

export interface WhatsAppChat {
  id: string;
  name: string;
  isGroup: boolean;
  unreadCount: number;
  timestamp: number;
}

export interface WhatsAppMessage {
  id: string;
  body: string;
  from: string;
  fromMe: boolean;
  author?: string;
  timestamp: number;
  type: string;
}
