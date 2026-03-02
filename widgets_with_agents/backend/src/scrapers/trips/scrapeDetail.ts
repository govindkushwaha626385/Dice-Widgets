/**
 * Scrapes a single trip detail page: overview, itinerary, transactions.
 * URL: https://corporate.dice.tech/app/travel/trips/details/{tripId}
 */
import type { Page } from "playwright";
import { detailSelectors } from "./selectors.js";

export interface TripDetailOverview {
  status?: string;
  employee?: string;
  cashAdvances?: string;
  travelAdvance?: string;
  calculatedBudget?: string;
  usedBudget?: string;
  totalTxns?: string;
}

export interface TripDetailItineraryItem {
  text: string;
}

export interface TripDetailTransaction {
  amount: string;
  id: string;
  owner?: string;
  date?: string;
  service?: string;
}

export interface ScrapedTripDetail {
  tripId: string;
  overview: TripDetailOverview;
  itinerary: TripDetailItineraryItem[];
  transactions: TripDetailTransaction[];
}

const DETAIL_WAIT_MS = 3000;
const GOTO_TIMEOUT_MS = 45000;

/** Exclude "View System logs" from scraped content (don't scrape, don't show). */
function isViewSystemLogs(s: string | undefined | null): boolean {
  return /view\s+system\s+logs/i.test((s ?? "").trim());
}

function sanitizeOverviewValue<T>(v: T): T | undefined {
  if (typeof v !== "string") return v;
  return isViewSystemLogs(v) ? undefined : (v as T);
}

function getDetailUrl(origin: string, tripId: string): string {
  const base = origin.replace(/\/+$/, "");
  return `${base}/app/travel/trips/details/${encodeURIComponent(tripId)}`;
}

/** Extract overview stats from top row (Status, Employee, Cash Advances) and budget row */
async function extractOverview(page: Page): Promise<TripDetailOverview> {
  const overview: TripDetailOverview = {};
  const bodyText = await page.evaluate(() => document.body.innerText).catch(() => "");
  const lines = bodyText.split(/\n/).map((s) => s.trim()).filter(Boolean);

  const getAfter = (label: string): string => {
    const i = lines.findIndex((l) => l.toLowerCase().includes(label.toLowerCase()));
    if (i >= 0 && i + 1 < lines.length) {
      const val = lines[i + 1].trim();
      return isViewSystemLogs(val) ? "" : val;
    }
    const same = lines.find((l) => {
      const lower = l.toLowerCase();
      if (lower === label.toLowerCase()) return true;
      if (lower.startsWith(label.toLowerCase() + " ")) return true;
      return false;
    });
    if (same) {
      const rest = same.slice(label.length).trim();
      if (rest && !isViewSystemLogs(rest)) return rest;
    }
    return "";
  };

  const rawStatus = getAfter("Status") || (lines.find((l) => /^PENDING$|^APPROVED$|^REJECTED$/i.test(l)) ?? "");
  overview.status = isViewSystemLogs(rawStatus) ? undefined : rawStatus || undefined;
  const emp = getAfter("Employee");
  overview.employee = emp ? sanitizeOverviewValue(emp) ?? undefined : undefined;
  const cash = getAfter("Cash Advances");
  overview.cashAdvances = cash ? sanitizeOverviewValue(cash) ?? undefined : undefined;

  const travelMatch = bodyText.match(/INR\s*[\d,]+\s*\/\s*[\d,]+/);
  if (travelMatch) overview.travelAdvance = travelMatch[0].trim();

  const calcMatch = bodyText.match(/Calculated Budget[\s\S]*?INR\s*[\d,]+/i);
  if (calcMatch) {
    const m = calcMatch[0].match(/INR\s*[\d,]+/);
    if (m) overview.calculatedBudget = m[0].trim();
  }
  const usedMatch = bodyText.match(/Used Budget[\s\S]*?INR\s*[\d,]+/i);
  if (usedMatch) {
    const m = usedMatch[0].match(/INR\s*[\d,]+/);
    if (m) overview.usedBudget = m[0].trim();
  }
  const txnMatch = bodyText.match(/Total Txns[\s\S]*?(\d+)/i);
  if (txnMatch) overview.totalTxns = txnMatch[1]?.trim() ?? "";

  // Never store "View System logs" in any overview field
  for (const k of Object.keys(overview) as (keyof TripDetailOverview)[]) {
    const v = overview[k];
    if (typeof v === "string" && isViewSystemLogs(v)) overview[k] = undefined;
  }

  // Fallback: scrape by DOM
  const statBlocks = await page.$$(".row .col-12 [class*='col-']").catch(() => []);
  for (const block of statBlocks) {
    const pair = await block.evaluate((el) => {
      const p = el.querySelector("p");
      const label = p?.textContent?.trim() ?? "";
      const next = p?.nextElementSibling;
      const value = next ? (next as HTMLElement).textContent?.trim() ?? "" : "";
      return { label: label.replace(/\s+/g, " "), value: value.replace(/\s+/g, " ") };
    }).catch(() => ({ label: "", value: "" }));
    if (/^Status$/i.test(pair.label) && !isViewSystemLogs(pair.value))
      overview.status = pair.value || overview.status;
    if (/^Employee$/i.test(pair.label) && !isViewSystemLogs(pair.value))
      overview.employee = pair.value || overview.employee;
    if (/^Cash Advances$/i.test(pair.label) && !isViewSystemLogs(pair.value))
      overview.cashAdvances = pair.value || overview.cashAdvances;
  }

  const travelEl = await page.$(detailSelectors.travelAdvanceCard).catch(() => null);
  if (travelEl && !overview.travelAdvance) {
    const t = await travelEl.evaluate((el) => (el as HTMLElement).innerText?.trim()).catch(() => "");
    if (t) overview.travelAdvance = t;
  }

  const budgetRow = await page.$(detailSelectors.budgetRow).catch(() => null);
  if (budgetRow) {
    const text = await budgetRow.evaluate((el) => (el as HTMLElement).innerText ?? "").catch(() => "");
    const calc = text.match(/Calculated Budget\s*INR\s*([\d,]+)/i);
    if (calc && !overview.calculatedBudget) overview.calculatedBudget = `INR ${calc[1]}`;
    const used = text.match(/Used Budget\s*INR\s*([\d,]+)/i);
    if (used && !overview.usedBudget) overview.usedBudget = `INR ${used[1]}`;
    const txns = text.match(/Total Txns\s*(\d+)/i);
    if (txns && !overview.totalTxns) overview.totalTxns = txns[1];
  }

  return overview;
}

/** Extract itinerary items from .itinerary-container .trip-card (exclude "View System logs"). */
async function extractItinerary(page: Page): Promise<TripDetailItineraryItem[]> {
  const container = await page.$(detailSelectors.itineraryContainer).catch(() => null);
  if (!container) return [];
  const cards = await container.$$(detailSelectors.tripCard).catch(() => []);
  const items: TripDetailItineraryItem[] = [];
  for (const card of cards) {
    const text = await card.evaluate((el) => (el as HTMLElement).innerText?.trim() ?? "").catch(() => "");
    if (text && !isViewSystemLogs(text)) items.push({ text });
  }
  return items;
}

/** Extract transactions from .expense-card */
async function extractTransactions(page: Page): Promise<TripDetailTransaction[]> {
  const cards = await page.$$(detailSelectors.expenseCard).catch(() => []);
  const list: TripDetailTransaction[] = [];
  for (const card of cards) {
    const amount = await card.$eval("h4.heading.fw-bold, h4.fw-bold", (el) => (el as HTMLElement).innerText?.trim() ?? "").catch(() => "");
    const idEl = await card.$(".fw-bold.text-truncate.text-small").catch(() => null);
    const id = idEl ? await idEl.evaluate((el) => (el as HTMLElement).innerText?.trim() ?? "").catch(() => "") : "";
    const smallTexts = await card.$$eval(".text-small", (nodes) =>
      nodes.map((n) => (n as HTMLElement).innerText?.trim() ?? "")
    ).catch(() => []);
    let owner = "";
    let date = "";
    let service = "";
    for (const line of smallTexts) {
      if (line.startsWith("Owner:")) owner = line.replace(/^Owner:\s*/i, "").trim();
      else if (line.startsWith("Date:")) date = line.replace(/^Date:\s*/i, "").trim();
      else if (line.startsWith("Service:")) service = line.replace(/^Service:\s*/i, "").trim();
    }
    list.push({ amount, id, owner: owner || undefined, date: date || undefined, service: service || undefined });
  }
  return list;
}

export async function scrapeTripDetail(
  page: Page,
  origin: string,
  tripId: string
): Promise<ScrapedTripDetail | null> {
  const url = getDetailUrl(origin, tripId);
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: GOTO_TIMEOUT_MS });
  await page.waitForSelector("id=wrapper, #root, .row", { timeout: 15000 }).catch(() => null);
  await new Promise((r) => setTimeout(r, DETAIL_WAIT_MS));

  const overview = await extractOverview(page);
  const itinerary = await extractItinerary(page);
  const transactions = await extractTransactions(page);

  return {
    tripId,
    overview,
    itinerary,
    transactions,
  };
}

/** Click Delete on the trip detail page; optional confirmSelector for confirmation modal */
export async function clickTripDelete(
  page: Page,
  confirmSelector?: string
): Promise<{ success: boolean; message?: string }> {
  let btn = await page.$(detailSelectors.deleteButton).catch(() => null);
  if (!btn) {
    btn = await page.getByRole("button", { name: /delete/i }).first().elementHandle().catch(() => null);
  }
  if (!btn) return { success: false, message: "Delete button not found" };
  const disabled = await btn.getAttribute("disabled").catch(() => null);
  if (disabled !== null) return { success: false, message: "Delete button is disabled" };
  await btn.click().catch(() => null);
  await new Promise((r) => setTimeout(r, 1500));
  if (confirmSelector) {
    const confirmBtn = await page.$(confirmSelector).catch(() => null);
    if (confirmBtn) {
      await confirmBtn.click().catch(() => null);
      await new Promise((r) => setTimeout(r, 1500));
    }
  }
  // Also try common confirm patterns
  const confirmByText = await page.getByRole("button", { name: /confirm|yes|delete/i }).first().elementHandle().catch(() => null);
  if (confirmByText) {
    await confirmByText.click().catch(() => null);
    await new Promise((r) => setTimeout(r, 1500));
  }
  return { success: true };
}
