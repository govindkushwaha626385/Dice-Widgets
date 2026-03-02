/**
 * Scrapes the transaction list page and returns an array of expense summaries.
 * Uses selectors from selectors.ts so you can adjust when the DOM changes.
 */
import type { Page } from "playwright";
import { listSelectors } from "./selectors.js";

export interface ScrapedExpenseItem {
  id: string;
  service: string;
  amount: string;
  transactionDate: string;
  submissionDate: string;
  createdBy: string;
  type: string;
}

/** Match expense ID like O-INTERN-000000547 or #O-INTERN-000000547 */
function extractId(s: string | undefined | null): string {
  const raw = s == null ? "" : String(s);
  const match =
    raw.match(/(?:#?)(O-[A-Z0-9-]+)/i) || raw.match(/([A-Z0-9]+-[A-Z0-9-]+)/i);
  const id = match ? (match[1] ?? match[0] ?? "").trim() : raw.replace(/^#/, "").trim();
  return id;
}

const GOTO_TIMEOUT_MS = 60000;

export async function scrapeExpensesList(page: Page, listUrl: string): Promise<ScrapedExpenseItem[]> {
  await page.goto(listUrl, { waitUntil: "commit", timeout: GOTO_TIMEOUT_MS });
  await page.waitForSelector(listSelectors.tableWrapper, { timeout: 20000 }).catch(() => null);
  await new Promise((r) => setTimeout(r, 2000));
  let rows = await page.$$(listSelectors.row);
  if (rows.length === 0) rows = await page.$$(listSelectors.rowFallback);
  const items: ScrapedExpenseItem[] = [];
  for (const row of rows) {
    const text = (sel: string) =>
      row.$eval(sel, (el) => (el as HTMLElement).innerText?.trim() ?? "").catch(() => "");
    const detailRaw = await text(listSelectors.cellDetailId);
    let id = (detailRaw ?? "").replace(/^#/, "").trim();
    if (!id) id = extractId(await text(listSelectors.cellDetailIdFallback));
    if (!id || id.length < 5) continue;
    const service = await text(listSelectors.cellService);
    const amount = await text(listSelectors.cellAmount);
    const transactionDate = await text(listSelectors.cellTransactionDate);
    const submissionDate = await text(listSelectors.cellSubmissionDate);
    const createdBy = await text(listSelectors.cellCreatedBy);
    const type = await text(listSelectors.cellType);
    items.push({
      id,
      service: service ?? "",
      amount: amount ?? "",
      transactionDate: transactionDate ?? "",
      submissionDate: submissionDate ?? "",
      createdBy: createdBy ?? "",
      type: type ?? "",
    });
  }
  return items;
}
