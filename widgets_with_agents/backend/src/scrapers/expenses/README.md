# Expenses scraper

Scrapes the transaction list and detail pages for the Expenses widget.

- **List:** `DICE_TRANSACTION_BASE_URL` (default: `https://corporate.dice.tech/app/transaction`)
- **Detail:** same base URL with `?_id=<expenseId>` (e.g. `O-INTERN-000000547`)

## Authentication (one-time)

**When using the Electron app:** On first launch you’ll see a “Sign in to Dice once” screen. Click “Open Dice login”, sign in to the Dice dashboard in the window that opens, and the app will save your session automatically. No manual file or env is needed; auth is stored in the app’s user data and reused for all future runs.

**When running the backend alone (e.g. dev or headless):** Use the manual flow below (save session script + `DICE_AUTH_STATE_PATH` in backend/.env).

## Updating when the DOM changes

1. **Selectors** – Edit `selectors.ts` only. All CSS selectors for the list and detail pages are there.
2. **List parsing** – If the table structure changes, adjust `scrapeList.ts` (it uses `selectors.listSelectors`).
3. **Detail parsing** – If the sidepane or timeline structure changes, adjust `scrapeDetail.ts` (it uses `selectors.detailSelectors`).

## Authentication

The transaction site requires login. You don’t “find” `DICE_AUTH_STATE_PATH` — you **create** it by saving your logged-in session once.

### 1. Save your session (one-time)

From the **backend** folder:

```bash
cd backend
npx tsx scripts/save-dice-auth-state.ts
```

- A browser window opens at the transaction URL.
- **Log in** there (same as you do in a normal browser).
- When you see the expenses table, switch back to the terminal and **press Enter**.
- The script saves your session to `backend/dice-auth-state.json`.

### 2. Point the scraper at that file

In **backend/.env** add (use a path relative to the backend folder or absolute):

```env
DICE_AUTH_STATE_PATH=./dice-auth-state.json
```

Restart the app. The Expenses widget will use this saved session when scraping, so it will see the same data as when you’re logged in.
