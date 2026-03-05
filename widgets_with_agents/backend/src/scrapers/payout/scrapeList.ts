/**
 * Scrapes the Transfers & Accounts (payout) list page with pagination.
 * Page: https://corporate.dice.tech/app/payout
 * Table columns: Details (id, name, addedOn, office), Status, Account, Amount, Actions.
 */
import type { Page } from "playwright";
import { listSelectors } from "./selectors.js";

export interface ScrapedPayoutItem {
  transferId: string;
  name: string;
  number: string;
  addedOn: string;
  office: string;
  status: string;
  account: string;
  amount: string;
}

const GOTO_TIMEOUT_MS = 90_000; // allow slow corporate.dice.tech
const PAGINATION_WAIT_MS = 1500;

/** Extract transfer ID (32-char hex) from Details text; used for recall API. */
function extractTransferId(s: string | undefined | null): string {
  const raw = s == null ? "" : String(s).trim();
  const match = raw.match(/#?([a-f0-9]{32})/i);
  return match ? match[1].trim() : "";
}

/** Parse Details cell: first line often ID or name; then "Added On ...", "Office: ...". */
function parseDetailsCell(text: string): { name: string; number: string; addedOn: string; office: string } {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  let name = "";
  let number = "";
  let addedOn = "";
  let office = "";
  for (const line of lines) {
    if (/added\s*on/i.test(line)) {
      addedOn = line.replace(/added\s*on\s*/i, "").trim();
    } else if (/office\s*:?/i.test(line)) {
      office = line.replace(/office\s*:?\s*/i, "").trim();
    } else if (line.match(/^#?[a-f0-9]{32}$/i)) {
      // skip id line
    } else if (line && !name) {
      const paren = line.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
      if (paren) {
        name = paren[1].trim();
        number = paren[2].trim();
      } else {
        name = line;
      }
    }
  }
  return { name, number, addedOn, office };
}

function parseAmount(text: string): string {
  const raw = text.trim();
  if (!raw) return "";
  if (/INR|₹/i.test(raw)) return raw.replace(/\s+/g, " ").trim();
  return raw;
}

async function scrapePageItems(page: Page): Promise<ScrapedPayoutItem[]> {
  let rows = await page.$$(listSelectors.row);
  if (rows.length === 0) rows = await page.$$(listSelectors.rowFallback);

  const items: ScrapedPayoutItem[] = [];
  for (const row of rows) {
    const text = (sel: string) =>
      row.$eval(sel, (el) => (el as HTMLElement).innerText?.trim() ?? "").catch(() => "");

    const detailsText = await text(listSelectors.cellDetails);
    const transferId = extractTransferId(detailsText);
    if (!transferId) continue;

    const { name, number, addedOn, office } = parseDetailsCell(detailsText);
    const status = await text(listSelectors.cellStatus);
    const account = await text(listSelectors.cellAccount);
    const amountText = await text(listSelectors.cellAmount);
    const amount = parseAmount(amountText);

    items.push({
      transferId,
      name: name ?? "",
      number: number ?? "",
      addedOn: addedOn ?? "",
      office: office ?? "",
      status: status ?? "",
      account: account ?? "",
      amount: amount ?? "",
    });
  }
  return items;
}

async function hasNextPage(page: Page): Promise<boolean> {
  const nextBtn = await page.$(listSelectors.nextButton).catch(() => null);
  if (!nextBtn) return false;
  const disabled = await nextBtn.getAttribute("disabled").catch(() => null);
  return disabled === null;
}

async function goToNextPage(page: Page): Promise<boolean> {
  const nextBtn = await page.$(listSelectors.nextButton).catch(() => null);
  if (!nextBtn) return false;
  const disabled = await nextBtn.getAttribute("disabled").catch(() => null);
  if (disabled !== null) return false;
  await nextBtn.click().catch(() => {});
  await new Promise((r) => setTimeout(r, PAGINATION_WAIT_MS));
  return true;
}

export async function scrapePayoutList(
  page: Page,
  listUrl: string
): Promise<ScrapedPayoutItem[]> {
  await page.goto(listUrl, { waitUntil: "commit", timeout: GOTO_TIMEOUT_MS });
  await page.waitForSelector(listSelectors.table, { timeout: 20000 }).catch(() => null);
  await new Promise((r) => setTimeout(r, 2000));

  const allItems: ScrapedPayoutItem[] = [];
  let pageNum = 1;
  const maxPages = 50;

  while (pageNum <= maxPages) {
    const pageItems = await scrapePageItems(page);
    for (const item of pageItems) {
      if (item.transferId) allItems.push(item);
    }
    const hasNext = await hasNextPage(page);
    if (!hasNext) break;
    const went = await goToNextPage(page);
    if (!went) break;
    pageNum++;
  }

  return allItems;
}
