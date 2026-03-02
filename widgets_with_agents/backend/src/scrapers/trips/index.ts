/**
 * Trips scraper: list and detail from corporate.dice.tech/app/travel/trips.
 * Uses same Dice auth state as vouchers/expenses.
 */
import { chromium } from "playwright";
import { getDiceAuthStatePath } from "../../config/diceAuthPath.js";
import { scrapeTripsList } from "./scrapeList.js";
import { scrapeTripDetail } from "./scrapeDetail.js";
import type { ScrapedTripItem } from "./scrapeList.js";
import type { ScrapedTripDetail } from "./scrapeDetail.js";

const DICE_ORIGIN = process.env.DICE_TRANSACTION_BASE_URL
  ? new URL(process.env.DICE_TRANSACTION_BASE_URL).origin
  : "https://corporate.dice.tech";
const TRIPS_LIST_URL = `${DICE_ORIGIN}/app/travel/trips`;

export type { ScrapedTripItem } from "./scrapeList.js";
export type { ScrapedTripDetail } from "./scrapeDetail.js";

function getContextOptions() {
  const authStatePath = getDiceAuthStatePath();
  return {
    ...(authStatePath ? { storageState: authStatePath } : {}),
    viewport: { width: 1280, height: 800 },
    ignoreHTTPSErrors: true,
  };
}

/** Scrape all trips from the trips list page (all paginated pages). */
export async function runTripsListScraper(): Promise<ScrapedTripItem[]> {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext(getContextOptions());
    const page = await context.newPage();
    const items = await scrapeTripsList(page, TRIPS_LIST_URL);
    await context.close();
    return items;
  } finally {
    await browser.close();
  }
}

/** Scrape one trip's detail page (overview, itinerary, transactions). */
export async function runTripDetailScraper(tripId: string): Promise<ScrapedTripDetail | null> {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext(getContextOptions());
    const page = await context.newPage();
    const detail = await scrapeTripDetail(page, DICE_ORIGIN, tripId);
    await context.close();
    return detail;
  } finally {
    await browser.close();
  }
}

