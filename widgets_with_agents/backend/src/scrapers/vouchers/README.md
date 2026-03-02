# Vouchers scraper

Scrapes the expense vouchers list and detail pages for the Vouchers widget.

- **List:** `https://corporate.dice.tech/app/settlements/expenseVoucher`
- **Detail:** `https://corporate.dice.tech/app/voucher/{voucherId}/details`

## Authentication

Uses the same Dice auth as the expenses scraper (in-app login or `DICE_AUTH_STATE_PATH`). See `../expenses/README.md`.

## Selectors

- **List:** `selectors.ts` → `listSelectors` (table, rows, cell indices for Details, Office, Department, Amount, etc.)
- **Detail:** `selectors.ts` → `detailSelectors` (Overview, timeline, approve/decline buttons)

When the Dice DOM changes, update `selectors.ts` first, then list/detail scrapers if needed.

## API

- `GET /api/widgets/vouchers` — list of vouchers
- `GET /api/widgets/vouchers/:id` — voucher detail (details, employee, timeline)
- `POST /api/widgets/vouchers/:id/approve` — click Approve on the detail page
- `POST /api/widgets/vouchers/:id/decline` — click Decline on the detail page
