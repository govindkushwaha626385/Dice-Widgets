/**
 * Dice dashboard one-time login: open in-app window, capture session, save as Playwright storage state.
 * Auth is stored in userData/dice-auth-state.json and passed to backend via DICE_AUTH_STATE_PATH.
 */
const { app, BrowserWindow, session } = require("electron");
const path = require("path");
const fs = require("fs");

const DICE_LOGIN_PARTITION = "persist:dice-login";
const DICE_BASE_URL = process.env.DICE_TRANSACTION_BASE_URL || "https://corporate.dice.tech";
const DICE_LOGIN_URL = `${DICE_BASE_URL}/app/transaction`;
/** URL pattern that indicates user is logged in (transaction or dashboard). */
const DICE_LOGGED_IN_PATTERN = /corporate\.dice\.tech\/app\/(transaction|dashboard|)/;

function getDiceAuthStatePath() {
  return path.join(app.getPath("userData"), "dice-auth-state.json");
}

function hasDiceAuth() {
  const p = getDiceAuthStatePath();
  try {
    return fs.existsSync(p) && fs.statSync(p).size > 0;
  } catch {
    return false;
  }
}

/**
 * Map Electron cookie to Playwright storage state cookie format.
 * Playwright: name, value, domain, path, expires (Unix sec), httpOnly, secure, sameSite ("Strict"|"Lax"|"None")
 */
function electronCookieToPlaywright(c) {
  const sameSiteMap = {
    strict: "Strict",
    lax: "Lax",
    no_restriction: "None",
    unspecified: "Lax",
  };
  const sameSite = sameSiteMap[c.sameSite] || "Lax";
  const expires = c.expirationDate != null ? c.expirationDate : -1;
  return {
    name: c.name,
    value: c.value,
    domain: c.domain || "",
    path: c.path || "/",
    expires: typeof expires === "number" ? expires : -1,
    httpOnly: !!c.httpOnly,
    secure: !!c.secure,
    sameSite,
  };
}

/**
 * Save cookies from the Dice login session to Playwright storage state file.
 * Backend scrapers use this file via DICE_AUTH_STATE_PATH.
 */
async function saveDiceAuthFromSession() {
  const ses = session.fromPartition(DICE_LOGIN_PARTITION);
  const cookies = await ses.cookies.get({});
  const playwrightCookies = cookies.map(electronCookieToPlaywright).filter((c) => c.domain && c.name);
  const statePath = getDiceAuthStatePath();
  const state = {
    cookies: playwrightCookies,
    origins: [],
  };
  fs.writeFileSync(statePath, JSON.stringify(state, null, 0), "utf8");
  return statePath;
}

/**
 * Notify backend to use this auth path (for dev when backend runs separately).
 * @param {number} port - backend port
 * @param {string} statePath - path to dice-auth-state.json
 */
async function notifyBackendPath(port, statePath) {
  try {
    await fetch(`http://127.0.0.1:${port}/api/widgets/dice-auth/set-path`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: statePath }),
    });
  } catch (e) {
    // Backend may not be running (e.g. prod where we pass env at start)
  }
}

function sendToReply(replyTo, channel, ...args) {
  if (replyTo && !replyTo.isDestroyed()) {
    try {
      replyTo.send(channel, ...args);
    } catch (e) {
      console.error("Dice auth send failed:", e);
    }
  }
}

/**
 * Open the Dice login window. When user reaches the app (transaction/dashboard), save auth and close.
 * @param {Electron.BrowserWindow | null} mainWindow - used to send 'dice-auth-saved' when done
 * @param {{ backendPort?: number; replyTo?: Electron.WebContents }} options - replyTo: webContents to send events to (invoker)
 * @returns {Promise<void>}
 */
function openDiceLoginWindow(mainWindow, options = {}) {
  const { backendPort, replyTo } = options;
  const target = replyTo || (mainWindow && !mainWindow.isDestroyed() ? mainWindow.webContents : null);

  const diceSession = session.fromPartition(DICE_LOGIN_PARTITION);
  diceSession.setCertificateVerifyProc((_request, callback) => callback(0));

  return new Promise((resolve, reject) => {
    let loginWin;
    try {
      console.log("[Dice auth] Creating login window for", DICE_LOGIN_URL);
      loginWin = new BrowserWindow({
        width: 960,
        height: 720,
        title: "Sign in to Dice",
        show: true,
        center: true,
        alwaysOnTop: true,
        setVisibleOnAllWorkspaces: true,
        webPreferences: {
          partition: DICE_LOGIN_PARTITION,
          nodeIntegration: false,
          contextIsolation: true,
          sandbox: false,
          webSecurity: true,
        },
      });
    } catch (err) {
      console.error("Dice login window create failed:", err);
      sendToReply(target, "dice-auth-error", err.message);
      reject(err);
      return;
    }

    setImmediate(() => {
      if (loginWin && !loginWin.isDestroyed()) {
        if (typeof loginWin.moveTop === "function") loginWin.moveTop();
        loginWin.focus();
        loginWin.show();
        sendToReply(target, "dice-auth-window-opened");
      }
    });
    setTimeout(() => {
      if (loginWin && !loginWin.isDestroyed()) {
        if (typeof loginWin.moveTop === "function") loginWin.moveTop();
        loginWin.focus();
      }
    }, 500);

    let saved = false;

    const trySaveAndClose = async () => {
      if (saved) return;
      const url = loginWin.webContents.getURL();
      if (!DICE_LOGGED_IN_PATTERN.test(url)) return;
      saved = true;
      try {
        const statePath = await saveDiceAuthFromSession();
        if (typeof backendPort === "number") {
          await notifyBackendPath(backendPort, statePath);
        }
        sendToReply(target, "dice-auth-saved", statePath);
      } catch (err) {
        console.error("Dice auth save failed:", err);
        sendToReply(target, "dice-auth-error", err.message);
      }
      loginWin.removeListener("closed", onClosed);
      loginWin.close();
      resolve();
    };

    loginWin.webContents.on("did-navigate", (_event, url) => {
      if (DICE_LOGGED_IN_PATTERN.test(url)) trySaveAndClose();
    });
    loginWin.webContents.on("did-navigate-in-page", (_event, url) => {
      if (DICE_LOGGED_IN_PATTERN.test(url)) trySaveAndClose();
    });

    const onClosed = () => {
      resolve();
    };
    loginWin.on("closed", onClosed);

    const errorHtml = `data:text/html,${encodeURIComponent(`
      <!DOCTYPE html><html><head><meta charset="utf-8"><title>Sign in to Dice</title></head>
      <body style="font-family:system-ui;padding:2rem;max-width:480px;margin:0 auto;">
        <h1 style="color:#4338ca;">Sign in to Dice</h1>
        <p>This window could not load the Dice login page. Possible causes:</p>
        <ul>
          <li>Network or VPN is blocking corporate.dice.tech</li>
          <li>SSL certificate not trusted on this machine</li>
        </ul>
        <p>You can close this window to continue. Use "Open Dice in browser" in the app to sign in there, or try again after checking your network.</p>
        <p style="color:#64748b;font-size:0.875rem;">Close this window (red button or Cmd+W) to open the main app.</p>
      </body></html>
    `)}`;

    loginWin.loadURL(DICE_LOGIN_URL).catch((err) => {
      console.error("Dice login window load failed:", err);
      sendToReply(target, "dice-auth-error", err.message);
      if (loginWin && !loginWin.isDestroyed()) {
        loginWin.loadURL(errorHtml).catch(() => {});
      }
    });
  });
}

module.exports = {
  getDiceAuthStatePath,
  hasDiceAuth,
  openDiceLoginWindow,
};
