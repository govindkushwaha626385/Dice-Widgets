/**
 * Vendor Advance scraper: list and detail from corporate.dice.tech/app/vendor/advance.
 * Uses same Dice auth state as vouchers/trips.
 */
import { chromium } from "playwright";
import { getDiceAuthStatePath } from "../../config/diceAuthPath.js";
import { scrapeVendorAdvancesList } from "./scrapeList.js";
import { scrapeVendorAdvanceDetail } from "./scrapeDetail.js";
import type { ScrapedVendorAdvanceItem } from "./scrapeList.js";
import type { ScrapedVendorAdvanceDetail } from "./scrapeDetail.js";

const DICE_ORIGIN = process.env.DICE_TRANSACTION_BASE_URL
  ? new URL(process.env.DICE_TRANSACTION_BASE_URL).origin
  : "https://corporate.dice.tech";
const VENDOR_ADVANCE_LIST_URL = `${DICE_ORIGIN}/app/vendor/advance`;

export type { ScrapedVendorAdvanceItem } from "./scrapeList.js";
export type { ScrapedVendorAdvanceDetail } from "./scrapeDetail.js";

function getContextOptions() {
  const authStatePath = getDiceAuthStatePath();
  return {
    ...(authStatePath ? { storageState: authStatePath } : {}),
    viewport: { width: 1280, height: 800 },
    ignoreHTTPSErrors: true,
  };
}

/** Scrape all vendor advances from the list page (all paginated pages). */
export async function runVendorAdvancesListScraper(): Promise<ScrapedVendorAdvanceItem[]> {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext(getContextOptions());
    const page = await context.newPage();
    const items = await scrapeVendorAdvancesList(page, VENDOR_ADVANCE_LIST_URL);
    await context.close();
    return items;
  } finally {
    await browser.close();
  }
}

/** Scrape one vendor advance detail (opens list, clicks View, scrapes side panel). */
export async function runVendorAdvanceDetailScraper(advanceId: string): Promise<ScrapedVendorAdvanceDetail | null> {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext(getContextOptions());
    const page = await context.newPage();
    const detail = await scrapeVendorAdvanceDetail(page, VENDOR_ADVANCE_LIST_URL, advanceId);
    await context.close();
    return detail;
  } finally {
    await browser.close();
  }
}
