# Personal Assistant Web Application

Modular widget-based UI with Node/Express/Supabase backend. See **IMPLEMENTATION_PLAN.md** for full architecture and phases.

## Stack

- **Frontend:** React (Vite), TypeScript, Tailwind CSS, C1 Thesys (for chatbot)
- **Backend:** Node.js, Express, Supabase (Auth & Postgres)
- **AI:** LangChain / LangGraph (planned for agentic flows)

## Setup

1. **Environment**
   - Copy `.env.example` to `frontend/.env` and `backend/.env` (or root `.env`).
   - Create a [Supabase](https://supabase.com) project and set:
     - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (frontend)
     - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (backend)

2. **Gmail & Calendar (optional)**  
   - To show real emails and calendar events in the Emails and Calendar widgets, add your **Google OAuth** credentials to **`backend/.env`**:
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`
   - See **`backend/GOOGLE_API_SETUP.md`** for where to get these and how to generate a refresh token.

3. **Database**
   - In Supabase SQL Editor, run the migration: `supabase/migrations/001_initial_schema.sql`

4. **Run**
   - **Web:** Backend: `cd backend && npm run dev` (port 3001); Frontend: `cd frontend && npm run dev` (port 5173).
   - **Desktop (Electron):** From project root run `npm install` then `npm run electron:dev` (starts frontend, backend, and Electron; API calls go over **IPC** from renderer to main, main forwards to backend).

5. **Auth**
   - Sign up at `/signup` (creates user + profile with **UID-2026XXX**).
   - Login redirects to **/my-widgets**.

## Project structure

- `electron/main.js` — Electron main process: starts backend (or waits in dev), creates window, **IPC** handlers (`api`, `open-external`).
- `electron/preload.js` — Preload script: exposes `window.electronAPI.invoke(channel, data)` and `openExternal(url)` via contextBridge.
- `frontend/src/lib/electronApi.ts` — In Electron, `apiFetch()` uses IPC to main process instead of `fetch()`; `openExternal()` opens URLs in system browser.
- `frontend/src/widgets/`, `hooks/`, `lib/supabase.ts` — React app (same as web).
- `backend/src/app.ts` — Express app export; `index.ts` starts server when run directly.
- `supabase/migrations/` — schema, RLS.

## Next steps (from plan)

- Implement remaining widgets (Trip, Shortcuts, Products, PR, Voucher) with modal forms.
- Add **Master Fetch** `/api/view-data` and **/view-data** page (progressive disclosure, timelines, logs).
- Integrate **C1 Thesys** + OpenAI for Chatbot widget; add LangChain/LangGraph for agentic workflows.
