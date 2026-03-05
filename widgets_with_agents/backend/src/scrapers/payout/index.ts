/**
 * Transfers & Accounts (payout) scraper: list from corporate.dice.tech/app/payout.
 */
import { chromium } from "playwright";
import { getDiceAuthStatePath } from "../../config/diceAuthPath.js";
import { scrapePayoutList } from "./scrapeList.js";
import type { ScrapedPayoutItem } from "./scrapeList.js";

const DICE_ORIGIN = process.env.DICE_TRANSACTION_BASE_URL
  ? new URL(process.env.DICE_TRANSACTION_BASE_URL).origin
  : "https://corporate.dice.tech";
const PAYOUT_URL = `${DICE_ORIGIN}/app/payout`;

export type { ScrapedPayoutItem } from "./scrapeList.js";

function getContextOptions() {
  const authStatePath = getDiceAuthStatePath();
  return {
    ...(authStatePath ? { storageState: authStatePath } : {}),
    viewport: { width: 1280, height: 800 },
    ignoreHTTPSErrors: true,
  };
}

/** Scrape all transfers from the payout list page (all paginated pages). */
export async function runPayoutListScraper(): Promise<ScrapedPayoutItem[]> {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext(getContextOptions());
    const page = await context.newPage();
    const items = await scrapePayoutList(page, PAYOUT_URL);
    await context.close();
    return items;
  } finally {
    await browser.close();
  }
}
