/**
 * Electron main process: app window, backend process, IPC handlers.
 * Loads frontend (Vite in dev, built files in prod) and forwards API calls to backend.
 */

const { app: electronApp, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const { spawn } = require("child_process");
const http = require("http");

// Must run before app ready (puppeteer-in-electron for WhatsApp)
require("puppeteer-in-electron").initialize(electronApp);
const whatsappService = require("./whatsappService");
const diceAuth = require("./diceAuth");

const isDev = process.env.NODE_ENV !== "production" && !electronApp.isPackaged;
const BACKEND_PORT = parseInt(process.env.PORT || "3001", 10);
let backendProcess = null;
let mainWindow = null;
const WIDGET_WINDOW_SIZE = { width: 960, height: 720 };

// --- Paths ---
function getRootPath() {
  if (electronApp.isPackaged) {
    return path.join(process.resourcesPath);
  }
  return path.join(__dirname, "..");
}

// --- Backend process (dev: wait for existing; prod: spawn) ---
function startBackend() {
  return new Promise((resolve, reject) => {
    const root = getRootPath();
    const backendSrc = path.join(__dirname, "..", "backend", "src", "index.ts");
    const backendDist = electronApp.isPackaged
      ? path.join(root, "backend", "dist", "index.js")
      : path.join(root, "backend", "dist", "index.js");

    const env = {
      ...process.env,
      PORT: String(BACKEND_PORT),
      DICE_AUTH_STATE_PATH: diceAuth.getDiceAuthStatePath(),
    };
    const useTsx = isDev; // In dev use tsx for backend; in prod use built JS
    const script = useTsx ? backendSrc : backendDist;
    const exec = useTsx ? "npx" : "node";
    const args = useTsx ? ["tsx", script] : [script];

    const backendDir = path.join(root, "backend");
    backendProcess = spawn(exec, args, {
      cwd: backendDir,
      env: { ...env },
      stdio: "inherit",
      shell: true,
    });

    backendProcess.on("error", (err) => reject(err));
    backendProcess.on("exit", (code) => {
      if (code !== 0 && code !== null) {
        console.error("Backend exited with code", code);
      }
    });

    waitForBackend(BACKEND_PORT)
      .then(resolve)
      .catch(reject);
  });
}

function waitForBackend(port, maxAttempts = 30) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const tryConnect = () => {
      const req = http.get(`http://127.0.0.1:${port}/api/health`, (res) => {
        let data = "";
        res.on("data", (ch) => (data += ch));
        res.on("end", () => {
          if (res.statusCode === 200) return resolve();
          if (++attempts < maxAttempts) return setTimeout(tryConnect, 200);
          reject(new Error("Backend did not become ready"));
        });
      });
      req.on("error", () => {
        if (++attempts < maxAttempts) return setTimeout(tryConnect, 200);
        reject(new Error("Backend did not become ready"));
      });
      req.setTimeout(1000, () => {
        req.destroy();
        if (++attempts < maxAttempts) return setTimeout(tryConnect, 200);
        reject(new Error("Backend timeout"));
      });
    };
    setTimeout(tryConnect, 300);
  });
}

// --- Main window ---
/** showInitially: false when Dice login is shown first. */
function createWindow(showInitially = true) {
  const root = getRootPath();
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    show: showInitially,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });
  mainWindow = win;
  whatsappService.setMainWindow(win);

  if (isDev) {
    win.loadURL("http://localhost:5173");
    if (showInitially) win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(root, "frontend", "dist", "index.html"));
  }

  win.on("closed", () => {
    if (win === mainWindow) {
      mainWindow = null;
      if (backendProcess) {
        backendProcess.kill();
        backendProcess = null;
      }
    }
  });
}

// --- Secondary window (widget popout or external URL) ---
function openWindow(url, title) {
  const win = new BrowserWindow({
    width: WIDGET_WINDOW_SIZE.width,
    height: WIDGET_WINDOW_SIZE.height,
    title: title || "Window",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  if (url && (url.startsWith("http") || url.startsWith("https") || url.startsWith("file://"))) {
    win.loadURL(url);
  } else {
    const root = getRootPath();
    win.loadFile(path.join(root, "frontend", "dist", "index.html"));
  }
}

// ========== IPC handlers (renderer → main) ==========

// Supabase: fetch from main (avoids renderer CORS)
ipcMain.handle("supabase-fetch", async (_event, { url, method = "GET", headers = {}, body }) => {
  try {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json", ...headers },
      body: body !== undefined && body !== null && method !== "GET" ? body : undefined,
    });
    const text = await res.text();
    const resHeaders = {};
    res.headers.forEach((v, k) => {
      resHeaders[k] = v;
    });
    return { ok: res.ok, status: res.status, statusText: res.statusText, headers: resHeaders, body: text };
  } catch (err) {
    // Network timeout / unreachable (e.g. ConnectTimeoutError) - return error so renderer can fallback to its own fetch
    return {
      ok: false,
      status: 503,
      statusText: "Service Unavailable",
      headers: {},
      body: JSON.stringify({ error: "network_error", message: err?.message || "Could not reach server" }),
    };
  }
});

// App API: forward to local backend (renderer calls this instead of fetch)
ipcMain.handle("api", async (_event, { path: apiPath, method = "GET", body }) => {
  const url = `http://127.0.0.1:${BACKEND_PORT}${apiPath}`;
  const opts = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (body !== undefined && body !== null && method !== "GET") {
    opts.body = typeof body === "string" ? body : JSON.stringify(body);
  }
  const res = await fetch(url, opts);
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { ok: res.ok, status: res.status, data };
});

// Open URL in system browser / new window / close window
ipcMain.handle("open-external", async (_event, url) => {
  const { shell } = require("electron");
  await shell.openExternal(url);
});
ipcMain.handle("notify", async (_event, { title, body }) => {
  const { Notification } = require("electron");
  if (Notification.isSupported()) {
    new Notification({ title: title || "Personal Assistant", body: body || "" }).show();
  }
});
ipcMain.handle("open-window", async (_event, { url, title }) => {
  openWindow(url || "http://localhost:5173", title || "Window");
});
ipcMain.handle("close-window", async () => {
  const win = BrowserWindow.getFocusedWindow();
  if (win) win.close();
});

// Dice auth (one-time login flow)
ipcMain.handle("dice-auth-status", () => ({ hasAuth: diceAuth.hasDiceAuth() }));
ipcMain.handle("dice-auth-open-login", async (event) => {
  console.log("[Dice auth] Open login requested");
  const win = mainWindow && !mainWindow.isDestroyed() ? mainWindow : BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
  const replyTo = event.sender;
  try {
    await diceAuth.openDiceLoginWindow(win, {
      backendPort: isDev ? BACKEND_PORT : undefined,
      replyTo,
    });
    console.log("[Dice auth] Login window flow finished");
  } catch (err) {
    console.error("[Dice auth] Error:", err);
    if (replyTo && !replyTo.isDestroyed()) {
      replyTo.send("dice-auth-error", err && err.message ? err.message : String(err));
    }
  }
});

// WhatsApp (wwebjs-electron)
ipcMain.handle("whatsapp-init", async () => {
  try {
    return await whatsappService.initialize(electronApp);
  } catch (e) {
    return { status: "disconnected", error: e.message };
  }
});
ipcMain.handle("whatsapp-status", () => whatsappService.getStatus());
ipcMain.handle("whatsapp-get-chats", async () => {
  try {
    return { ok: true, chats: await whatsappService.getChats() };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});
ipcMain.handle("whatsapp-get-messages", async (_event, { chatId, limit }) => {
  try {
    const messages = await whatsappService.getMessages(chatId, limit || 50);
    return { ok: true, messages };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});
ipcMain.handle("whatsapp-reset", async () => {
  await whatsappService.reset();
});

// ========== App lifecycle ==========
electronApp.whenReady().then(async () => {
  if (!isDev) {
    const { session } = require("electron");
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      const csp = [
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline'",
        "connect-src 'self' http://127.0.0.1:* http://localhost:* ws://127.0.0.1:* ws://localhost:*",
        "img-src 'self' data:",
        "font-src 'self' data:",
      ].join("; ");
      callback({
        responseHeaders: { ...details.responseHeaders, "Content-Security-Policy": [csp] },
      });
    });
  }
  try {
    if (isDev) {
      await waitForBackend(BACKEND_PORT);
    } else {
      await startBackend();
    }
    const needsDiceAuth = !diceAuth.hasDiceAuth();
    createWindow(!needsDiceAuth);
    if (needsDiceAuth && mainWindow) {
      diceAuth.openDiceLoginWindow(mainWindow, {
        backendPort: isDev ? BACKEND_PORT : undefined,
        replyTo: mainWindow.webContents,
      }).then(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.show();
          mainWindow.focus();
          if (isDev) mainWindow.webContents.openDevTools();
        }
      }).catch((err) => {
        console.error("[Dice auth] First-run login failed:", err);
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.show();
          mainWindow.focus();
          if (isDev) mainWindow.webContents.openDevTools();
        }
      });
    }
    whatsappService.initialize(electronApp).catch(() => {});
  } catch (err) {
    console.error("Failed to start backend:", err);
    electronApp.quit();
  }
});

electronApp.on("window-all-closed", () => {
  if (backendProcess) {
    backendProcess.kill();
    backendProcess = null;
  }
  electronApp.quit();
});
