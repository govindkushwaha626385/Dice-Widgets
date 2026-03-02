# Personal Assistant Web App — Implementation Plan

## 1. Technical Stack & Architecture

| Layer | Choices |
|-------|--------|
| **Frontend** | React 18, Vite, TypeScript, Tailwind CSS, C1 Thesys (`@thesysai/genui-sdk`, `@crayonai/react-ui`) |
| **Backend** | Node.js, Express, Supabase (Auth + Postgres) |
| **Architecture** | Clean Architecture — frontend: `/widgets`, `/hooks`, `/services`; backend: MVC + services |
| **API** | Single **Master Fetch** `/api/view-data` returning all records; filter by `user_id` on client or in shared service |
| **AI / Agentic** | LangChain + LangGraph (or Deep Agent / multi-agent) for chatbot and future agent workflows; C1 Thesys for generative UI in chat |

---

## 2. Folder Structure

```
widgets_with_agents/
├── frontend/
│   ├── src/
│   │   ├── components/       # Shared UI (layout, modals, forms)
│   │   ├── widgets/          # One folder per widget (Expense, Trip, etc.)
│   │   ├── hooks/            # useAuth, useViewData, useWidgets, etc.
│   │   ├── services/         # API client, auth service, view-data service
│   │   ├── types/            # DB row types, API types
│   │   ├── lib/              # supabase client, constants
│   │   ├── pages/            # Route pages (Login, SignUp, MyWidgets, ViewData)
│   │   └── App.tsx
│   ├── package.json
│   └── vite.config.ts
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── models/           # Optional; Supabase as primary data layer
│   │   ├── services/         # Business logic, UID/VID generation, view-data aggregation
│   │   ├── middleware/       # auth, error handling
│   │   └── config/           # Supabase admin client, env
│   ├── package.json
│   └── tsconfig.json
├── supabase/
│   └── migrations/           # SQL for tables, RLS, triggers (UID/VID)
├── IMPLEMENTATION_PLAN.md
├── .env.example
└── README.md
```

---

## 3. Database Schema (Supabase)

All tables: `id` (uuid, PK), `user_id` (uuid, FK to auth.users or profiles), `created_at` (timestamptz).  
**UID format:** `UID-2026XXX` (e.g. 7-digit sequence). **VID format:** `VID-2026XXX`.

| Table | Columns (in addition to id, user_id, created_at) |
|-------|--------------------------------------------------|
| **profiles** | name, email, phone, address, account_no, ifsc, uid (unique), ... |
| **expenses** | title, category (Travel/Food), date, merchant, amount, bill_no, file_url, ... |
| **trips** | title, start_date, end_date, source, destination, amount |
| **custom_fields** | title, field_id, type (text, date, number, etc.), placeholder |
| **shortcuts** | title, url |
| **notes** | title, content (text) |
| **products** | name, sku, description, quantity, unit_price, ... (inventory) |
| **purchase_requisitions (prs)** | pr_number, status, items (jsonb or separate table), ... |
| **vouchers** | vid (auto), amount, type, reference_id, ... |
| **activity_logs** | widget_type, action, entity_id, payload (jsonb) — for /view-data logs |

- **Auth:** Supabase Auth for sign-up/login; `profiles` (or extended user metadata) stores UID and extra fields.
- **Vouchers:** Trigger or backend service to set `vid = 'VID-' || to_char(now(), 'YYYY') || lpad(nextval('voucher_seq')::text, 6, '0')` (or equivalent).

---

## 4. Feature Phases

### Phase 1 — Auth & Layout
- Sign-up: name, email, phone, address, account_no, ifsc, password → create auth user + profile with **UID-2026XXX**.
- Login → redirect to **/my-widgets**.
- App shell: sidebar/header, protected routes.

### Phase 2 — Widget Dashboard (/my-widgets)
- Responsive grid of widgets.
- Each widget: **WidgetWrapper** with 1–2 preview items + **+** icon opening a **Popup/Modal** form.
- Widgets: Expense, Trip, Custom Fields, Calendar/Emails (placeholder), **Chatbot (C1 Thesys + OpenAI)**, Shortcuts, Notes, Product, PR, Voucher.
- Forms submit to backend; backend writes to Supabase and optionally writes **activity_logs**.

### Phase 3 — Data & Visualization (/view-data)
- **Master Fetch:** GET `/api/view-data` returns all entities (expenses, trips, PRs, vouchers, etc.) with `user_id`; client or service layer filters to current user and optionally sorts (e.g. current user first).
- Progressive disclosure / streaming for large payloads (chunked JSON or SSE).
- **Dynamic form:** Render form from **custom_fields** table (type, placeholder, etc.).
- **Timelines:** Progress trackers for Advances, Expenses, PRs, Vouchers.
- **Logs:** Section showing **activity_logs** for all widgets.

### Phase 4 — AI & Agentic (Chatbot & beyond)
- **Chatbot widget:** C1 Thesys (`C1Component` / `C1Chat`) + OpenAI (or C1 API); optional LangChain/LangGraph for multi-step or tool-calling flows.
- **Agents:** LangGraph for workflows (e.g. “create expense + attach to trip”), Deep Agent or multi-agent for complex tasks; backend exposes endpoints that agents call (create expense, create PR, etc.).

---

## 5. Coding Standards

- **Naming:** `useAuth`, `WidgetWrapper`, `DataTable`, `view-data` (kebab in URLs).
- **TypeScript:** Strict types for all DB rows and API request/response in `frontend/src/types` and backend DTOs.
- **Styling:** Tailwind only; clean, professional, “Assistant-like” UI.
- **API:** REST; single **view-data** endpoint for dashboard data; other endpoints per resource (expenses, trips, etc.) for CRUD.

---

## 6. Build Order (This Task)

1. **Plan** — This document.
2. **Scaffold** — Frontend (Vite + React + TS + Tailwind) and Backend (Express + TS).
3. **Supabase** — Client config (frontend + backend), `.env.example`, migration SQL for all tables + RLS + UID/VID.
4. **Auth** — Sign-up (with UID generation), Login, redirect to `/my-widgets`, protected routes.
5. **My-widgets** — Layout (grid), **WidgetWrapper**, 1–2 placeholder widgets with + and modal (e.g. Expense, Notes) to establish pattern.

Next steps after this: implement remaining widgets, then `/view-data` and Master Fetch, then C1 Thesys chatbot and LangChain/LangGraph integration.
