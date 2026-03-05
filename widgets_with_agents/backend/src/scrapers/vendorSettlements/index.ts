/**
 * Vendor Settlements scraper: list from corporate.dice.tech/app/settlements/vendor.
 * Uses same Dice auth state as other scrapers.
 */
import { chromium } from "playwright";
import { getDiceAuthStatePath } from "../../config/diceAuthPath.js";
import { scrapeVendorSettlementsList } from "./scrapeList.js";
import type { ScrapedVendorSettlementItem } from "./scrapeList.js";

const DICE_ORIGIN = process.env.DICE_TRANSACTION_BASE_URL
  ? new URL(process.env.DICE_TRANSACTION_BASE_URL).origin
  : "https://corporate.dice.tech";
const VENDOR_SETTLEMENTS_URL = `${DICE_ORIGIN}/app/settlements/vendor`;

export type { ScrapedVendorSettlementItem } from "./scrapeList.js";

function getContextOptions() {
  const authStatePath = getDiceAuthStatePath();
  return {
    ...(authStatePath ? { storageState: authStatePath } : {}),
    viewport: { width: 1280, height: 800 },
    ignoreHTTPSErrors: true,
  };
}

/** Scrape all vendor settlements from the list page (all paginated pages). */
export async function runVendorSettlementsListScraper(): Promise<ScrapedVendorSettlementItem[]> {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext(getContextOptions());
    const page = await context.newPage();
    const items = await scrapeVendorSettlementsList(page, VENDOR_SETTLEMENTS_URL);
    await context.close();
    return items;
  } finally {
    await browser.close();
  }
}
