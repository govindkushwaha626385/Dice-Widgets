/**
 * Scrapes the Employee Settlements list page with pagination.
 * Page: https://corporate.dice.tech/app/settlements/employee
 * Table columns: Details (name, voucher, entity), Ledger Id, Type, Date, Amount, Actions.
 */
import type { Page } from "playwright";
import { listSelectors } from "./selectors.js";

export interface ScrapedSettlementItem {
  ledgerId: string;
  employeeName: string;
  voucherNumber: string;
  entityName: string;
  type: string;
  date: string;
  amount: string;
}

const GOTO_TIMEOUT_MS = 60000;
const PAGINATION_WAIT_MS = 1500;

function extractLedgerId(s: string | undefined | null): string {
  const raw = s == null ? "" : String(s).trim();
  const match = raw.match(/(LEDGER-[A-Z0-9-]+)/i);
  return match ? match[1].trim() : raw;
}

function parseDetailsCell(text: string): { employeeName: string; voucherNumber: string; entityName: string } {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const employeeName = lines[0] ?? "";
  let voucherNumber = "";
  let entityName = "";
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const vMatch = line.match(/#?(V-INTERN-[A-Z0-9-]+)/i) || line.match(/#(V-[A-Z0-9-]+)/i);
    if (vMatch) voucherNumber = (vMatch[1] ?? line).trim();
    const eMatch = line.match(/Entity\s*Name\s*:\s*(.*)/i);
    if (eMatch) entityName = eMatch[1]?.trim() ?? "";
  }
  return { employeeName, voucherNumber, entityName };
}

function parseAmount(text: string): string {
  const raw = text.trim();
  if (!raw) return "";
  if (/INR|₹/i.test(raw)) return raw.replace(/\s+/g, " ").trim();
  return raw;
}

async function scrapePageItems(page: Page): Promise<ScrapedSettlementItem[]> {
  let rows = await page.$$(listSelectors.row);
  if (rows.length === 0) rows = await page.$$(listSelectors.rowFallback);

  const items: ScrapedSettlementItem[] = [];
  for (const row of rows) {
    const text = (sel: string) =>
      row.$eval(sel, (el) => (el as HTMLElement).innerText?.trim() ?? "").catch(() => "");

    const detailsText = await text(listSelectors.cellDetails);
    const { employeeName, voucherNumber, entityName } = parseDetailsCell(detailsText);

    const ledgerIdRaw = await text(listSelectors.cellLedgerId);
    const ledgerId = extractLedgerId(ledgerIdRaw);
    if (!ledgerId) continue;

    const type = await text(listSelectors.cellType);
    const date = await text(listSelectors.cellDate);
    const amountText = await text(listSelectors.cellAmount);
    const amount = parseAmount(amountText);

    items.push({
      ledgerId,
      employeeName: employeeName ?? "",
      voucherNumber: voucherNumber ?? "",
      entityName: entityName ?? "",
      type: type ?? "",
      date: date ?? "",
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

export async function scrapeEmployeeSettlementsList(
  page: Page,
  listUrl: string
): Promise<ScrapedSettlementItem[]> {
  await page.goto(listUrl, { waitUntil: "commit", timeout: GOTO_TIMEOUT_MS });
  await page.waitForSelector(listSelectors.table, { timeout: 20000 }).catch(() => null);
  await new Promise((r) => setTimeout(r, 2000));

  const allItems: ScrapedSettlementItem[] = [];
  let pageNum = 1;
  const maxPages = 50;

  while (pageNum <= maxPages) {
    const pageItems = await scrapePageItems(page);
    for (const item of pageItems) {
      if (item.ledgerId) allItems.push(item);
    }
    const hasNext = await hasNextPage(page);
    if (!hasNext) break;
    const went = await goToNextPage(page);
    if (!went) break;
    pageNum++;
  }

  return allItems;
}
