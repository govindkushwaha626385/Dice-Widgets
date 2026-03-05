/**
 * Scrapes the Vendor Advance list page with pagination.
 * Page: https://corporate.dice.tech/app/vendor/advance
 */
import type { Page } from "playwright";
import { listSelectors } from "./selectors.js";

export interface ScrapedVendorAdvanceItem {
  id: string;
  vendorName: string;
  tdsCode: string;
  poNumber: string;
  amount: string;
  /** Numeric id for approve/decline API if found (e.g. from View link) */
  numericId?: number;
}

const GOTO_TIMEOUT_MS = 60000;
const PAGINATION_WAIT_MS = 1500;

function extractAdvanceId(s: string | undefined | null): string {
  const raw = s == null ? "" : String(s).trim();
  const match = raw.match(/(VC_ADVANCE-[A-Z0-9-]+)/i) || raw.match(/([A-Z]+-[A-Z0-9-]+)/i);
  return match ? (match[1] ?? match[0] ?? "").trim() : raw;
}

/** Get numeric id from a link href like /app/vendor/advance/17366 (any anchor in row) */
function extractNumericIdFromRow(row: import("playwright").ElementHandle): Promise<number | undefined> {
  return row.evaluate((el: Element) => {
    const links = el.querySelectorAll("a[href*='advance']");
    for (const link of Array.from(links)) {
      const href = (link as HTMLAnchorElement).getAttribute("href") ?? "";
      const m = href.match(/\/advance\/(\d+)/);
      if (m) return parseInt(m[1], 10);
    }
    return undefined;
  }).catch(() => undefined);
}

async function scrapePageItems(page: Page): Promise<ScrapedVendorAdvanceItem[]> {
  let rows = await page.$$(listSelectors.row);
  if (rows.length === 0) rows = await page.$$(listSelectors.rowFallback);

  const items: ScrapedVendorAdvanceItem[] = [];
  for (const row of rows) {
    const text = (sel: string) =>
      row.$eval(sel, (el) => (el as HTMLElement).innerText?.trim() ?? "").catch(() => "");

    const idRaw = await text(listSelectors.cellId);
    const id = extractAdvanceId(idRaw);
    if (!id) continue;

    const vendorName = await text(listSelectors.cellVendorName);
    const tdsCode = await text(listSelectors.cellTdsCode);
    const poNumber = await text(listSelectors.cellPoNumber);
    const amount = await text(listSelectors.cellAmount);
    const numericId = await extractNumericIdFromRow(row);

    items.push({
      id,
      vendorName: vendorName ?? "",
      tdsCode: tdsCode ?? "",
      poNumber: poNumber ?? "",
      amount: amount ?? "",
      numericId,
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

export async function scrapeVendorAdvancesList(
  page: Page,
  listUrl: string
): Promise<ScrapedVendorAdvanceItem[]> {
  await page.goto(listUrl, { waitUntil: "commit", timeout: GOTO_TIMEOUT_MS });
  await page.waitForSelector(listSelectors.table, { timeout: 20000 }).catch(() => null);
  await new Promise((r) => setTimeout(r, 2000));

  const allItems: ScrapedVendorAdvanceItem[] = [];
  let pageNum = 1;
  const maxPages = 50;

  while (pageNum <= maxPages) {
    const pageItems = await scrapePageItems(page);
    for (const item of pageItems) {
      if (item.id) allItems.push(item);
    }
    const hasNext = await hasNextPage(page);
    if (!hasNext) break;
    const went = await goToNextPage(page);
    if (!went) break;
    pageNum++;
  }

  return allItems;
}
