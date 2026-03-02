# Project Logic — How to Explain This App

## What it is

A **Personal Assistant** app that shows a dashboard of **widgets**: expenses, notes, trips, emails, calendar, tasks, WhatsApp contacts, chatbot, and more. It runs as a **web app** (browser) or as a **desktop app** (Electron). Users sign up, log in, and see their data on one page (**My Widgets**).

---

## High-level architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  FRONTEND (React + Vite + TypeScript + Tailwind)                │
│  • Pages: Login, SignUp, My Widgets                              │
│  • Widgets: each widget is a component (Emails, Calendar, etc.)  │
│  • Auth: Supabase client in the browser; session in localStorage │
└───────────────────────────┬─────────────────────────────────────┘
                            │
          In browser: fetch(proxy)   In Electron: IPC
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│  BACKEND (Node + Express) on port 3001                           │
│  • Auth: signup/login using Supabase Admin API                    │
│  • Profile: get profile by user_id                               │
│  • Google: Gmail, Calendar, Tasks (using refresh token in .env)  │
│  • Chat: POST /api/chat → OpenAI (if key set) or fallback reply  │
└───────────────────────────┬─────────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│  SUPABASE (Auth + Postgres)                                       │
│  • auth.users for login; profiles table with UID, name, email…   │
│  • Tables per widget: expenses, notes, trips, whatsapp_contacts…│
└───────────────────────────────────────────────────────────────────┘
```

- **Frontend** talks to the **backend** for API calls. The backend talks to **Supabase** (auth + DB) and to **Google APIs** / **OpenAI** when configured.
- **Electron** wraps the same frontend: the UI is still React, but API calls go through the **main process** via **IPC** instead of direct `fetch`, so the backend URL stays server-side.

---

## Electron: Main process, Renderer process, and IPC

When the app runs as a **desktop app**, Electron uses two kinds of processes and **IPC** (Inter-Process Communication) to let them talk safely.

### Main process

- **What it is:** The Node.js process that runs `electron/main.js`. There is **one** main process per app. It has full access to Node (e.g. `require`, `fs`, `child_process`).
- **What it does in this project:**
  - Starts (or waits for) the **backend** on port 3001.
  - Creates and manages **windows** (`BrowserWindow`): the main dashboard window and small widget windows.
  - Registers **IPC handlers** with `ipcMain.handle(channel, handler)`. When the renderer sends a message on that channel, the handler runs in the main process and can do things the renderer cannot (e.g. `fetch` to the backend, open external URLs, show native notifications, create new windows).
- **Where you see it:** All of `electron/main.js` runs in the main process (e.g. `createWindow()`, `openWindow()`, `ipcMain.handle("api", ...)`).

### Renderer process

- **What it is:** A process that **renders** a window. Each window (main or small) has its own renderer. It runs the **frontend** (HTML/CSS/JS): in this project, the React app loaded from `http://localhost:5173` (dev) or from the built `index.html` (prod).
- **What it can’t do:** By default it’s like a normal browser tab: **no** Node, **no** direct `require`, **no** access to the backend URL or the user’s files. That’s why the renderer doesn’t call `fetch("http://127.0.0.1:3001/...")` itself; it asks the main process to do it via IPC.
- **Where you see it:** All of your React code (pages, widgets, `electronApi.ts`) runs in a renderer process. `window.electronAPI` is injected into that world by the **preload** script.

### Preload script (bridge)

- **What it is:** A script that runs **before** the page loads, in a context that has access to both Node (e.g. `ipcRenderer`) and the ability to expose a safe API to the page.
- **What it does in this project:** `electron/preload.js` uses `contextBridge.exposeInMainWorld("electronAPI", { ... })` to add `window.electronAPI` with:
  - `invoke(channel, data)` → sends an IPC message to the main process and returns a Promise with the reply.
  - `openExternal(url)`, `openInWindow(url, title)`, `closeWindow()`, `notify(title, body)` → each calls `ipcRenderer.invoke("channel-name", ...)` so the main process can perform the action.
- So the **renderer** (React) never touches `ipcRenderer` directly; it only calls `window.electronAPI.invoke("api", { path, method, body })`, etc.

### IPC (Inter-Process Communication)

- **What it is:** The way the **renderer** and the **main** process send messages to each other. In this project we use **invoke/handle**: the renderer **invokes** a channel with some data; the main process **handles** that channel and returns a value (usually a Promise).
- **Flow in this project:**

```
Renderer (React)                    Main process (main.js)
─────────────────                   ─────────────────────

apiFetch("/api/gmail/emails")
  → window.electronAPI.invoke("api", { path: "/api/gmail/emails", method: "GET" })
        │
        │  IPC message
        ▼
                    ipcMain.handle("api", async (event, { path, method, body }) => {
                      const res = await fetch("http://127.0.0.1:3001/api/gmail/emails");
                      return { ok: res.ok, status: res.status, data: ... };
                    })
        │
        │  return value
        ▼
  ← Promise resolves with { ok, status, data }
  → React builds a Response and uses the data (e.g. setEmails(data.emails))
```

- **Channels used in this project:**

| Channel         | Direction        | Purpose |
|-----------------|------------------|--------|
| `api`           | Renderer → Main  | “Call the backend at this path/method/body and give me the result.” Main does `fetch(127.0.0.1:3001 + path)` and returns `{ ok, status, data }`. |
| `open-external` | Renderer → Main  | “Open this URL in the system browser.” Main uses `shell.openExternal(url)`. |
| `open-window`   | Renderer → Main  | “Open a new small window with this URL and title.” Main creates a new `BrowserWindow` and loads the URL. |
| `close-window`  | Renderer → Main  | “Close the current window.” Main gets the focused window and closes it. |
| `notify`        | Renderer → Main  | “Show a desktop notification.” Main uses Electron’s `Notification`. |
| `whatsapp-init` | Renderer → Main  | Start WhatsApp client (QR flow). Main uses wwebjs-electron; may emit `whatsapp-qr` / `whatsapp-ready` to renderer. |
| `whatsapp-status` | Renderer → Main | Return current state: `disconnected` / `loading` / `qr` / `ready` and optional QR data URL. |
| `whatsapp-get-chats` | Renderer → Main | Return list of chats (requires client `ready`). |
| `whatsapp-get-messages` | Renderer → Main | Return messages for a chat (payload: `{ chatId, limit }`). |

So: **IPC** is the messaging layer; the **main process** does the privileged work; the **renderer** is the UI and only talks to the main process through the API exposed by the **preload** script.

---

## How it runs: Web vs Electron

| | **Web** | **Electron (desktop)** |
|---|--------|-------------------------|
| **Start** | `npm run dev:frontend` + `npm run dev:backend` (or Vite proxy) | `npm run electron:dev` (starts frontend, backend, then Electron) |
| **API calls** | `fetch("/api/...")` → Vite proxy forwards to backend:3001 | `apiFetch("/api/...")` → preload exposes IPC → main process does `fetch("http://127.0.0.1:3001/api/...")` |
| **Open link** | `window.open(url)` | `openExternal(url)` → opens in system browser; `openInWindow(url, title)` → new small app window |

So the **logic** is the same; only the **transport** changes (direct fetch vs IPC).

---

## Auth flow

1. **Sign up** (`/signup`): User submits email, password, name, etc. → Frontend calls backend `POST /api/auth/signup` → Backend uses **Supabase Admin API** to create the user and a row in **profiles** (with a generated **UID**, e.g. UID-2026XXX).
2. **Login** (`/login`): User submits email + password → Frontend calls `POST /api/auth/login` → Backend checks with Supabase Auth and returns user info → Frontend stores session (Supabase client handles tokens).
3. **Protected routes**: Wrapper checks if the user is logged in; if not, redirects to `/login`. After login, user is sent to **/my-widgets**.
4. **Profile**: Backend has `GET /api/profile/me` (expects `x-user-id` header) to return the profile row (UID, name, email, etc.) for the current user.

---

## Data flow: Widgets and APIs

- **Widgets that use Supabase only** (expenses, notes, trips, WhatsApp contacts, etc.): The frontend uses the **Supabase client** (with the user’s session) to read/write tables. So data goes **frontend ↔ Supabase** directly; the backend is not in the path for these.
- **Widgets that use the backend**:  
  - **Gmail, Calendar, Tasks**: Frontend calls `apiFetch("/api/gmail/emails")`, etc. Backend reads **GOOGLE_*** from `.env`, uses a **refresh token** to get an access token, and calls Google APIs. Backend returns JSON; frontend shows it in the widget.  
  - **Chatbot**: Frontend calls `POST /api/chat` with `{ message }`. Backend uses **OPENAI_API_KEY** (if set) to call OpenAI and returns `{ reply }`; otherwise returns a simple fallback reply.

So: **Supabase-backed widgets** = frontend ↔ Supabase; **Google/Chat** = frontend → backend → Google/OpenAI.

---

## Integrations (backend .env)

| Variable | Purpose |
|----------|--------|
| **SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY** | Backend creates users and reads/writes on behalf of the app (signup, profile). |
| **GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN** | One OAuth2 “user” (e.g. your Gmail). Backend uses the refresh token to get access tokens and call Gmail, Calendar, Tasks APIs. |
| **OPENAI_API_KEY** | Optional. When set, `/api/chat` uses OpenAI (e.g. GPT-4o-mini) for chatbot replies; otherwise a simple fallback reply is used. |

All of these are read from **backend/.env** so secrets stay on the server.

---

## Maximize and small windows

- **Maximize** on a widget no longer opens a full-screen overlay. It either:
  - **Emails / Calendar / Tasks**: Opens a **new small window** (960×720) that loads **Gmail / Google Calendar / Google Tasks** in the browser (so the user works in the real Google app).
  - **Other widgets** (Expenses, Notes, WhatsApp, etc.): Opens a **new small window** that loads the **same React app** with a query or hash like `?widget=expenses` or `#widget=expenses`. The app detects this and renders **only that widget** plus a “Close window” button. So each widget can live in its own window.
- **Close window**: In that small window, “Close window” calls Electron’s `close-window` IPC and closes that window only; the main window and backend keep running.

---

## WhatsApp “Open” and desktop notifications

- **WhatsApp**: Contacts are stored in Supabase (`whatsapp_contacts`). “Open” uses the link **whatsapp://send?phone=...** so the **WhatsApp desktop app** opens to that chat (if installed).
- **Notifications**: When the user adds/edits something in a widget, the frontend can call `notify(title, body)`. In Electron this goes over IPC to the main process, which shows a **native desktop notification**.

---

## WhatsApp in-app (Electron only)

In the **desktop app**, the WhatsApp widget can also **fetch chats and messages** inside the app using **wwebjs-electron** (WhatsApp Web running in a hidden Electron BrowserView).

- **Flow:** User clicks “Link WhatsApp (in-app)” in the maximized WhatsApp widget → main process starts the WhatsApp client → a **QR code** is shown in the widget → user scans with their phone (WhatsApp → Linked devices) → once ready, the widget shows **recent chats** and, when a chat is selected, **messages** (read-only).
- **Session:** Stored under the app’s user data directory in a folder **`wwebjs_auth`** (see `electron/whatsappService.js` → `getSessionPath(app)`). No extra configuration is required; the path is `app.getPath('userData') + '/wwebjs_auth'`. You can change the folder name or use a custom `dataPath` in `LocalAuth` if needed.
- **Configuration:** No env vars are required. The client uses **LocalAuth** with a fixed `clientId: 'wa-electron'` and the session path above. To use a different session directory, edit `getSessionPath()` in `electron/whatsappService.js` or pass a custom `dataPath` into `LocalAuth`.
- **Risks:** This uses the **unofficial** WhatsApp Web API. **Your phone number can be temporarily or permanently banned** if you automate, spam, or send bulk messages. This integration is **read-only** (get chats, get messages) to reduce risk; avoid adding send/bulk actions for production. Not suitable for enterprise; use the **Official WhatsApp Business API** for that.

---

## C1 Thesys (dynamic UI chatbot and analysis)

- **Chatbot:** When **THESYS_API_KEY** is set in `backend/.env`, the chatbot calls **C1 Thesys** (`POST /api/chat/c1`) so replies can be **dynamic UI** (cards, tables, forms) rendered via `@thesysai/genui-sdk` (C1Component). If Thesys is not configured, the app falls back to the existing `/api/chat` (OpenAI or fallback text).
- **Analysis:** The **Insights** section has an **Analysis** widget. It calls `POST /api/analysis` with the current user’s ID; the backend loads all app data (expenses, trips, vouchers, PRs, notes, products) from Supabase and sends it to C1 Thesys, which returns a generated analysis (e.g. summary cards, tables) rendered as dynamic UI.
- **Configuration:** Add `THESYS_API_KEY` to `backend/.env`. Get a key from [thesys.dev](https://thesys.dev).

---

## Approval workflow (Expenses, Trips, Vouchers, PRs)

- **Expenses, Trips, Vouchers:** Each row has a **status** (`pending` | `approved` | `declined`). In the maximized view you see **Status**, **Approve** / **Decline** (when status is pending), and **Details** to open a modal with full fields.
- **Purchase Requisitions:** Already had status (`draft`, `submitted`, `approved`, `rejected`). **Approve** sets `approved`, **Decline** sets `rejected`; **Details** opens the PR detail modal.
- **Database:** Migration `003_status_approval.sql` adds `status` to `expenses`, `trips`, and `vouchers` with default `pending`. Run Supabase migrations so the new column exists.

---

## One-sentence summary

**“It’s a personal dashboard app (React frontend + Express backend) that can run in the browser or as an Electron desktop app; users log in with Supabase, see widgets for expenses/notes/emails/calendar/tasks/WhatsApp/chatbot, and the backend wires in Google and OpenAI using keys in .env, while maximize opens either Google’s apps or a small window with just that widget.”**

You can use **PROJECT_LOGIC.md** as a reference when explaining the project to others.
