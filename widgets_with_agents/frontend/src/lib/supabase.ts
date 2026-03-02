import { createClient } from "@supabase/supabase-js";
import type { Database } from "../types/database";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";

/**
 * Use a no-op lock so Navigator LockManager is never used. In Electron, multiple windows
 * (main + widget windows) share the same origin and contend for one lock, causing
 * NavigatorLockAcquireTimeoutError and the main window stuck on "Loading...". Using a
 * no-op lock avoids cross-window contention; session is still read/written to storage.
 */
const noopLock = (_name: string, _acquireTimeout: number, fn: () => Promise<unknown>) => fn();

/**
 * In Electron: try main-process fetch first (avoids renderer "Failed to fetch").
 * If main process fails (e.g. connect timeout), fall back to renderer fetch so sign-in still works.
 */
function getFetch(): typeof fetch | undefined {
  if (typeof window === "undefined" || !window.electronAPI?.fetch) return undefined;
  const electronFetch = window.electronAPI.fetch;
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const isRequest = input instanceof Request;
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    let method = init?.method ?? "GET";
    let headers: Record<string, string> = {};
    let body: string | undefined;
    if (isRequest && input instanceof Request) {
      method = input.method;
      input.headers.forEach((v, k) => {
        headers[k] = v;
      });
      body = input.body ? await input.text() : undefined;
    } else {
      if (init?.headers) {
        if (init.headers instanceof Headers) {
          init.headers.forEach((v, k) => {
            headers[k] = v;
          });
        } else if (Array.isArray(init.headers)) {
          init.headers.forEach(([k, v]) => {
            headers[k] = v;
          });
        } else {
          Object.assign(headers, init.headers);
        }
      }
      body = init?.body != null ? (typeof init.body === "string" ? init.body : undefined) : undefined;
    }

    try {
      const r = await electronFetch(url, { method, headers, body });
      // If main process returned 503 (e.g. network timeout), try renderer fetch as fallback
      if (r.status === 503 && typeof fetch !== "undefined") {
        const fallback = await fetch(url, { method, headers: new Headers(headers), body });
        return fallback;
      }
      return new Response(r.body, {
        status: r.status,
        statusText: r.statusText,
        headers: new Headers(r.headers),
      });
    } catch {
      // IPC or serialization error - fall back to renderer fetch
      return fetch(url, { method, headers: new Headers(headers), body });
    }
  }) as typeof fetch;
}

const globalFetch = getFetch();

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: { lock: noopLock },
  ...(globalFetch ? { global: { fetch: globalFetch } } : {}),
});
