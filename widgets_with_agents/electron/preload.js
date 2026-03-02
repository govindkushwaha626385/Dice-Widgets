/**
 * Electron preload: exposes safe API to renderer via contextBridge.
 * Renderer uses window.electronAPI.invoke("api", ...) for backend calls, etc.
 */
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  invoke: (channel, data) => ipcRenderer.invoke(channel, data),
  fetch: (url, options = {}) => {
    let headers = options.headers || {};
    if (typeof Headers !== "undefined" && options.headers instanceof Headers && options.headers.entries) {
      headers = Object.fromEntries(Array.from(options.headers.entries()));
    }
    return ipcRenderer.invoke("supabase-fetch", {
      url: typeof url === "string" ? url : url.url,
      method: options.method || "GET",
      headers,
      body: options.body,
    });
  },
  openExternal: (url) => ipcRenderer.invoke("open-external", url),
  openInWindow: (url, title) => ipcRenderer.invoke("open-window", { url, title }),
  closeWindow: () => ipcRenderer.invoke("close-window"),
  notify: (title, body) => ipcRenderer.invoke("notify", { title, body }),
  whatsapp: {
    init: () => ipcRenderer.invoke("whatsapp-init"),
    getStatus: () => ipcRenderer.invoke("whatsapp-status"),
    getChats: () => ipcRenderer.invoke("whatsapp-get-chats"),
    getMessages: (chatId, limit) => ipcRenderer.invoke("whatsapp-get-messages", { chatId, limit }),
    reset: () => ipcRenderer.invoke("whatsapp-reset"),
    on: (channel, callback) => {
      const fn = (_event, ...args) => callback(...args);
      ipcRenderer.on(channel, fn);
      return () => ipcRenderer.removeListener(channel, fn);
    },
  },
  diceAuth: {
    getStatus: () => ipcRenderer.invoke("dice-auth-status"),
    openLogin: () => ipcRenderer.invoke("dice-auth-open-login"),
    onWindowOpened: (callback) => {
      const fn = () => callback();
      ipcRenderer.on("dice-auth-window-opened", fn);
      return () => ipcRenderer.removeListener("dice-auth-window-opened", fn);
    },
    onSaved: (callback) => {
      const fn = (_event, path) => callback(path);
      ipcRenderer.on("dice-auth-saved", fn);
      return () => ipcRenderer.removeListener("dice-auth-saved", fn);
    },
    onError: (callback) => {
      const fn = (_event, message) => callback(message);
      ipcRenderer.on("dice-auth-error", fn);
      return () => ipcRenderer.removeListener("dice-auth-error", fn);
    },
  },
});
