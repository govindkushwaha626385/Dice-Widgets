/**
 * WhatsApp client via wwebjs-electron (runs in Electron main process).
 * Session is persisted with LocalAuth. Use for reading chats/messages only to minimize ban risk.
 */

const { BrowserWindow, BrowserView } = require("electron");

/** Send to every app window so the QR shows in whichever window has the WhatsApp widget (e.g. maximized widget window). */
function sendToAllWindows(channel, ...args) {
  for (const win of BrowserWindow.getAllWindows()) {
    if (win.isDestroyed()) continue;
    const wc = win.webContents;
    if (wc && !wc.isDestroyed()) wc.send(channel, ...args);
  }
}
const path = require("path");
const QRCode = require("qrcode");

let pie = null;
let puppeteer = null;
let waClient = null;
let waWindow = null;
let waView = null;
let browser = null;
let mainWindowRef = null;
let status = "disconnected"; // 'disconnected' | 'loading' | 'qr' | 'ready'
let lastQrDataUrl = null;

const WA_SESSION_DIR = "wwebjs_auth";

function getSessionPath(app) {
  return path.join(app.getPath("userData"), WA_SESSION_DIR);
}

function serializeChat(chat) {
  if (!chat) return null;
  const id = chat.id && typeof chat.id === "object" && chat.id._serialized ? chat.id._serialized : String(chat.id || "");
  return {
    id,
    name: chat.name || id || "Unknown",
    isGroup: !!chat.isGroup,
    unreadCount: chat.unreadCount || 0,
    timestamp: chat.timestamp || 0,
  };
}

function serializeMessage(msg) {
  const id = msg.id && typeof msg.id === "object" && msg.id._serialized ? msg.id._serialized : String(msg.id);
  return {
    id,
    body: msg.body || "",
    from: msg.from,
    fromMe: !!msg.fromMe,
    author: msg.author,
    timestamp: msg.timestamp,
    type: msg.type,
  };
}

function sendToRenderer(channel, ...args) {
  sendToAllWindows(channel, ...args);
}

async function ensurePuppeteerElectron(app) {
  if (pie) return;
  pie = require("puppeteer-in-electron");
  puppeteer = require("puppeteer-core");
  // pie.initialize(app) must be called in main.js before app.whenReady() - already done there
}

async function createWhatsAppWindow(app) {
  if (waWindow && !waWindow.isDestroyed()) return waWindow;
  waWindow = new BrowserWindow({
    width: 800,
    height: 600,
    show: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
    },
  });
  waView = new BrowserView({
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
    },
  });
  waWindow.setBrowserView(waView);
  const bounds = waWindow.getContentBounds();
  waView.setBounds({ x: 0, y: 0, width: bounds.width, height: bounds.height });
  waWindow.on("closed", () => {
    waWindow = null;
    waView = null;
  });
  return waWindow;
}

async function getWaClient(app) {
  if (waClient) return waClient;
  await ensurePuppeteerElectron(app);
  await createWhatsAppWindow(app);
  browser = await pie.connect(app, puppeteer);
  const page = await pie.getPage(browser, waView);
  await page.setUserAgent(
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
  );

  const { Client, LocalAuth } = require("wwebjs-electron");
  const dataPath = getSessionPath(app);
  waClient = new Client({
    authStrategy: new LocalAuth({ clientId: "wa-electron", dataPath }),
    page,
  });

  waClient.on("qr", async (qr) => {
    status = "qr";
    try {
      lastQrDataUrl = await QRCode.toDataURL(qr, { width: 280, margin: 1 });
    } catch (e) {
      lastQrDataUrl = null;
    }
    sendToRenderer("whatsapp-qr", lastQrDataUrl);
  });

  waClient.on("ready", () => {
    status = "ready";
    lastQrDataUrl = null;
    if (waWindow && !waWindow.isDestroyed()) waWindow.hide();
    sendToRenderer("whatsapp-ready");
  });

  waClient.on("auth_failure", (msg) => {
    status = "disconnected";
    sendToRenderer("whatsapp-auth-failure", msg);
  });

  waClient.on("disconnected", (reason) => {
    status = "disconnected";
    sendToRenderer("whatsapp-disconnected", reason);
  });

  return waClient;
}

async function initialize(app) {
  if (status === "ready") return { status: "ready" };
  if (status === "loading") return { status: "loading", qr: lastQrDataUrl };
  status = "loading";
  sendToRenderer("whatsapp-status", "loading");
  try {
    const client = await getWaClient(app);
    // Don't await: initialize() resolves only after user scans QR. QR is sent via 'qr' event.
    client.initialize().catch((err) => {
      status = "disconnected";
      sendToRenderer("whatsapp-status", "disconnected");
      sendToRenderer("whatsapp-error", err && (err.message || String(err)));
    });
    return { status: "loading", qr: lastQrDataUrl };
  } catch (err) {
    status = "disconnected";
    sendToRenderer("whatsapp-status", "disconnected");
    sendToRenderer("whatsapp-error", err && (err.message || String(err)));
    throw err;
  }
}

function getStatus() {
  return { status, qr: lastQrDataUrl };
}

async function getChats() {
  if (!waClient || status !== "ready") {
    throw new Error("WhatsApp not ready. Initialize and scan QR first.");
  }
  let chats = await waClient.getChats();
  if (!chats || !Array.isArray(chats)) chats = [];
  if (chats.length === 0) {
    await new Promise((r) => setTimeout(r, 1500));
    chats = await waClient.getChats();
    if (!chats || !Array.isArray(chats)) chats = [];
  }
  return chats.map(serializeChat).filter(Boolean);
}

async function getMessages(chatId, limit = 50) {
  if (!waClient || status !== "ready") {
    throw new Error("WhatsApp not ready.");
  }
  const chat = await waClient.getChatById(chatId);
  const messages = await chat.fetchMessages({ limit: Math.min(limit, 100) });
  return messages.map(serializeMessage);
}

function setMainWindow(win) {
  mainWindowRef = win;
}

async function reset() {
  if (waClient) {
    try {
      await waClient.destroy();
    } catch (_) {}
    waClient = null;
  }
  if (waWindow && !waWindow.isDestroyed()) {
    waWindow.destroy();
    waWindow = null;
  }
  waView = null;
  browser = null;
  status = "disconnected";
  lastQrDataUrl = null;
  sendToRenderer("whatsapp-status", "disconnected");
}

module.exports = {
  initialize,
  getStatus,
  getChats,
  getMessages,
  setMainWindow,
  getSessionPath,
  reset,
};
