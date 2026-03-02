/**
 * Expenses scraper: list and detail + timeline from the transaction UI.
 * Base URL from env DICE_TRANSACTION_BASE_URL (default: https://corporate.dice.tech/app/transaction).
 * Auth: use in-app Dice login (Electron) or DICE_AUTH_STATE_PATH / set-path API (see config/diceAuthPath).
 */
import { chromium } from "playwright";
import { getDiceAuthStatePath } from "../../config/diceAuthPath.js";
import { scrapeExpensesList } from "./scrapeList.js";
import { scrapeExpenseDetail } from "./scrapeDetail.js";
import type { ScrapedExpenseItem } from "./scrapeList.js";
import type { ScrapedExpenseDetail } from "./scrapeDetail.js";

const BASE_URL = process.env.DICE_TRANSACTION_BASE_URL ?? "https://corporate.dice.tech/app/transaction";

export type { ScrapedExpenseItem } from "./scrapeList.js";
export type { ScrapedExpenseDetail } from "./scrapeDetail.js";

export async function runExpensesListScraper(): Promise<ScrapedExpenseItem[]> {
  const authStatePath = getDiceAuthStatePath();
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      ...(authStatePath ? { storageState: authStatePath } : {}),
      viewport: { width: 1280, height: 800 },
      ignoreHTTPSErrors: true,
    });
    const page = await context.newPage();
    const items = await scrapeExpensesList(page, BASE_URL);
    await context.close();
    return items;
  } finally {
    await browser.close();
  }
}

export async function runExpenseDetailScraper(expenseId: string): Promise<ScrapedExpenseDetail | null> {
  const authStatePath = getDiceAuthStatePath();
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      ...(authStatePath ? { storageState: authStatePath } : {}),
      viewport: { width: 1280, height: 800 },
      ignoreHTTPSErrors: true,
    });
    const page = await context.newPage();
    const detail = await scrapeExpenseDetail(page, BASE_URL, expenseId);
    await context.close();
    return detail;
  } finally {
    await browser.close();
  }
}
