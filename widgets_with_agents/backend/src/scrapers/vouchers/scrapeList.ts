/**
 * Scrapes the expense vouchers list page and returns an array of voucher summaries.
 */
import type { Page } from "playwright";
import { listSelectors } from "./selectors.js";

export interface ScrapedVoucherItem {
  id: string;
  office: string;
  department: string;
  createdBy: string;
  amount: string;
  claimed: string;
  voucherType: string;
  createdOn: string;
}

function extractVoucherId(s: string | undefined | null): string {
  const raw = s == null ? "" : String(s);
  const trimmed = raw.replace(/\s+/g, " ").trim();
  const match =
    trimmed.match(/(V-[A-Z0-9-]+)/i) || trimmed.match(/([A-Z]+-[A-Z0-9-]+)/);
  const id = match ? (match[1] ?? match[0] ?? "").trim() : trimmed;
  return id;
}

const GOTO_TIMEOUT_MS = 90_000; // allow slow corporate.dice.tech

export async function scrapeVouchersList(page: Page, listUrl: string): Promise<ScrapedVoucherItem[]> {
  await page.goto(listUrl, { waitUntil: "commit", timeout: GOTO_TIMEOUT_MS });
  await page.waitForSelector(listSelectors.tableWrapper, { timeout: 20000 }).catch(() => null);
  await page.waitForSelector(listSelectors.table, { timeout: 10000 }).catch(() => null);
  await new Promise((r) => setTimeout(r, 2000));

  let rows = await page.$$(listSelectors.row);
  if (rows.length === 0) rows = await page.$$(listSelectors.rowFallback);

  const items: ScrapedVoucherItem[] = [];
  for (const row of rows) {
    const text = (sel: string) =>
      row.$eval(sel, (el) => (el as HTMLElement).innerText?.trim() ?? "").catch(() => "");

    const detailsRaw = await text(listSelectors.cellDetails);
    const id = extractVoucherId(detailsRaw ?? "");
    if (!id || id.length < 5) continue;

    const office = await text(listSelectors.cellOffice);
    const department = await text(listSelectors.cellDepartment);
    const createdBy = await text(listSelectors.cellCreatedBy);
    const amount = await text(listSelectors.cellAmount);
    const claimed = await text(listSelectors.cellClaimed);
    const voucherType = await text(listSelectors.cellVoucherType);
    const createdOn = await text(listSelectors.cellCreatedOn);

    items.push({
      id,
      office: office ?? "",
      department: department ?? "",
      createdBy: createdBy ?? "",
      amount: amount ?? "",
      claimed: claimed ?? "",
      voucherType: voucherType ?? "",
      createdOn: createdOn ?? "",
    });
  }
  return items;
}
