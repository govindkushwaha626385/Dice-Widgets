/**
 * Vouchers scraper: list and detail from expense vouchers UI + approve/decline actions.
 * List: https://corporate.dice.tech/app/settlements/expenseVoucher
 * Detail: https://corporate.dice.tech/app/voucher/{id}/details
 */
import { chromium } from "playwright";
import { getDiceAuthStatePath } from "../../config/diceAuthPath.js";
import { scrapeVouchersList } from "./scrapeList.js";
import { scrapeVoucherDetail, clickVoucherAction } from "./scrapeDetail.js";
import { detailSelectors } from "./selectors.js";
import type { ScrapedVoucherItem } from "./scrapeList.js";
import type { ScrapedVoucherDetail } from "./scrapeDetail.js";

const DICE_ORIGIN = process.env.DICE_TRANSACTION_BASE_URL
  ? new URL(process.env.DICE_TRANSACTION_BASE_URL).origin
  : "https://corporate.dice.tech";
const LIST_URL = `${DICE_ORIGIN}/app/settlements/expenseVoucher`;

export type { ScrapedVoucherItem } from "./scrapeList.js";
export type { ScrapedVoucherDetail } from "./scrapeDetail.js";

const defaultContextOptions = () => {
  const authStatePath = getDiceAuthStatePath();
  return {
    ...(authStatePath ? { storageState: authStatePath } : {}),
    viewport: { width: 1280, height: 800 },
    ignoreHTTPSErrors: true,
  };
};

export async function runVouchersListScraper(): Promise<ScrapedVoucherItem[]> {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext(defaultContextOptions());
    const page = await context.newPage();
    const items = await scrapeVouchersList(page, LIST_URL);
    await context.close();
    return items;
  } finally {
    await browser.close();
  }
}

export async function runVoucherDetailScraper(voucherId: string): Promise<ScrapedVoucherDetail | null> {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext(defaultContextOptions());
    const page = await context.newPage();
    const detail = await scrapeVoucherDetail(page, DICE_ORIGIN, voucherId);
    await context.close();
    return detail;
  } finally {
    await browser.close();
  }
}

export async function runVoucherApprove(voucherId: string): Promise<{ success: boolean; message?: string }> {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext(defaultContextOptions());
    const page = await context.newPage();
    const url = `${DICE_ORIGIN}/app/voucher/${encodeURIComponent(voucherId)}/details`;
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForSelector(detailSelectors.approveBtn, { timeout: 10000 }).catch(() => null);
    const result = await clickVoucherAction(page, "approve");
    await context.close();
    return result;
  } finally {
    await browser.close();
  }
}

export async function runVoucherDecline(voucherId: string): Promise<{ success: boolean; message?: string }> {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext(defaultContextOptions());
    const page = await context.newPage();
    const url = `${DICE_ORIGIN}/app/voucher/${encodeURIComponent(voucherId)}/details`;
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForSelector(detailSelectors.declineBtn, { timeout: 10000 }).catch(() => null);
    const result = await clickVoucherAction(page, "decline");
    await context.close();
    return result;
  } finally {
    await browser.close();
  }
}
