/**
 * Employee Settlements scraper: list from corporate.dice.tech/app/settlements/employee.
 * Uses same Dice auth state as vouchers/vendor-advance/trips.
 */
import { chromium } from "playwright";
import { getDiceAuthStatePath } from "../../config/diceAuthPath.js";
import { scrapeEmployeeSettlementsList } from "./scrapeList.js";
import type { ScrapedSettlementItem } from "./scrapeList.js";

const DICE_ORIGIN = process.env.DICE_TRANSACTION_BASE_URL
  ? new URL(process.env.DICE_TRANSACTION_BASE_URL).origin
  : "https://corporate.dice.tech";
const EMPLOYEE_SETTLEMENTS_URL = `${DICE_ORIGIN}/app/settlements/employee`;

export type { ScrapedSettlementItem } from "./scrapeList.js";

function getContextOptions() {
  const authStatePath = getDiceAuthStatePath();
  return {
    ...(authStatePath ? { storageState: authStatePath } : {}),
    viewport: { width: 1280, height: 800 },
    ignoreHTTPSErrors: true,
  };
}

/** Scrape all employee settlements from the list page (all paginated pages). */
export async function runEmployeeSettlementsListScraper(): Promise<ScrapedSettlementItem[]> {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext(getContextOptions());
    const page = await context.newPage();
    const items = await scrapeEmployeeSettlementsList(page, EMPLOYEE_SETTLEMENTS_URL);
    await context.close();
    return items;
  } finally {
    await browser.close();
  }
}
