/**
 * Electron API bridge (renderer → main via IPC).
 * In Electron: uses preload-exposed electronAPI. In browser: falls back to fetch / window.
 */

export const isElectron =
  typeof window !== "undefined" && !!window.electronAPI;

/** Fetch API: via IPC in Electron (main calls backend), or direct fetch in browser. */
export async function apiFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  if (isElectron && window.electronAPI) {
    const { method = "GET", body } = options;
    const result = await window.electronAPI.invoke("api", {
      path,
      method,
      body: body != null ? (typeof body === "string" ? body : JSON.stringify(body)) : undefined,
    }) as { ok: boolean; status: number; data: unknown };
    const data = result.data as Record<string, unknown> | string;
    const blob = new Blob([typeof data === "string" ? data : JSON.stringify(data)], {
      type: "application/json",
    });
    return new Response(blob, { status: result.status, statusText: result.ok ? "OK" : "Error" });
  }
  return fetch(path, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers as Record<string, string>) },
  });
}

export function openExternal(url: string): void {
  if (isElectron && window.electronAPI) {
    window.electronAPI.openExternal(url);
  } else {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

/** Open a URL in a new small app window (Electron) or new tab (browser). For Gmail/Calendar/Tasks use the web URL. */
export function openInWindow(url: string, title: string): void {
  if (isElectron && window.electronAPI && window.electronAPI.openInWindow) {
    window.electronAPI.openInWindow(url, title);
  } else {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

/** Close the current window (Electron widget window). No-op in browser. */
export function closeWindow(): void {
  if (isElectron && window.electronAPI && window.electronAPI.closeWindow) {
    window.electronAPI.closeWindow();
  }
}

// --- Dice auth (Electron only) ---
/** Dice dashboard one-time auth (Electron only). */
export function getDiceAuthAPI(): {
  getStatus: () => Promise<{ hasAuth: boolean }>;
  openLogin: () => Promise<void>;
  onWindowOpened: (cb: () => void) => (() => void) | undefined;
  onSaved: (cb: (path?: string) => void) => (() => void) | undefined;
  onError: (cb: (message: string) => void) => (() => void) | undefined;
} | null {
  if (typeof window === "undefined" || !window.electronAPI?.diceAuth) return null;
  const d = window.electronAPI.diceAuth;
  return {
    getStatus: () => d.getStatus(),
    openLogin: () => d.openLogin(),
    onWindowOpened: (cb) => d.onWindowOpened?.(cb),
    onSaved: (cb) => d.onSaved?.(cb),
    onError: (cb) => d.onError?.(cb),
  };
}

// --- Notifications ---
/** Desktop notification (Electron or browser). */
export async function notify(title: string, body?: string): Promise<void> {
  if (isElectron && window.electronAPI) {
    await window.electronAPI.notify(title, body ?? "");
    return;
  }
  if (typeof Notification !== "undefined" && Notification.permission === "granted") {
    new Notification(title, { body: body ?? "" });
    return;
  }
  if (typeof Notification !== "undefined" && Notification.permission === "default") {
    const permission = await Notification.requestPermission();
    if (permission === "granted") new Notification(title, { body: body ?? "" });
  }
}
