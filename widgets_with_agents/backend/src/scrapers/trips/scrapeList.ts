/**
 * Scrapes the trips list page and all pages via pagination.
 * Page: https://corporate.dice.tech/app/travel/trips
 */
import type { Page } from "playwright";
import { listSelectors } from "./selectors.js";

export interface ScrapedTripItem {
  id: string;
  tripId: string;
  title: string;
  /** Cities in order e.g. "Indore → Amritsar" */
  citiesSequence: string;
  location: string;
  imageUrl: string;
  startDate: string;
  endDate: string;
  dateDisplay: string;
}

const GOTO_TIMEOUT_MS = 90_000; // allow slow corporate.dice.tech
const PAGINATION_WAIT_MS = 1500;

/** Extract TRIPS-INTERN-* or similar id from text */
function extractTripId(s: string | undefined | null): string {
  const raw = s == null ? "" : String(s);
  const trimmed = raw.replace(/\s+/g, " ").trim();
  const match = trimmed.match(/(TRIPS-[A-Z0-9-]+)/i) || trimmed.match(/([A-Z]+-[A-Z0-9-]+)/i);
  return match ? (match[1] ?? match[0] ?? "").trim() : trimmed;
}

/** Exclude "View System logs" from scraped content (don't scrape, don't show). */
function isViewSystemLogs(s: string | undefined | null): boolean {
  return /view\s+system\s+logs/i.test((s ?? "").trim());
}

/** Parse "01 Jun 25" "04 Jun 25" or "01 Jun 25  04 Jun 25" into startDate, endDate */
function parseDates(dateDisplay: string): { startDate: string; endDate: string } {
  const trimmed = dateDisplay.replace(/\s+/g, " ").trim();
  const match = trimmed.match(/(\d{1,2}\s+[A-Za-z]{3}\s+\d{2})\s*(\d{1,2}\s+[A-Za-z]{3}\s+\d{2})?/i);
  if (match) {
    return { startDate: match[1] ?? "", endDate: match[2] ?? "" };
  }
  if (trimmed) return { startDate: trimmed, endDate: "" };
  return { startDate: "", endDate: "" };
}

/** Scrape one page of trip cards into items */
async function scrapePageItems(page: Page): Promise<ScrapedTripItem[]> {
  let cards = await page.$$(listSelectors.tripCard);
  if (cards.length === 0) cards = await page.$$(listSelectors.tripCardFallback);

  const items: ScrapedTripItem[] = [];
  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    const text = (sel: string) =>
      card.$eval(sel, (el) => (el as HTMLElement).innerText?.trim() ?? "").catch(() => "");
    const attr = (sel: string, name: string) =>
      card.$eval(sel, (el, n: string) => (el as HTMLImageElement).getAttribute(n) ?? "", name).catch(() => "");

    const title = await text(listSelectors.tripTitle);
    const imageUrl = await attr(listSelectors.tripImage, "src");
    // Date: find .text-small that looks like date
    const allTextSmall = await card.$$eval(".text-small", (nodes) =>
      nodes.map((n) => (n as HTMLElement).innerText?.trim() ?? "")
    ).catch(() => []);
    const dateDisplay = allTextSmall.find((s) => /\d{1,2}\s+[A-Za-z]{3}\s+\d{2}/.test(s)) ?? allTextSmall.join(" ");
    const { startDate, endDate } = parseDates(dateDisplay);

    // Trip ID: div.w-auto.absolute (top-left of card)
    let tripIdRaw = await text(listSelectors.tripId).catch(() => "");
    if (!extractTripId(tripIdRaw)) tripIdRaw = await text(listSelectors.tripIdFallback).catch(() => "");
    if (!extractTripId(tripIdRaw)) {
      tripIdRaw = await card.evaluate((el) => {
        const walk = (node: Element): string => {
          if (node.nodeType === Node.TEXT_NODE && node.textContent) {
            const t = node.textContent.trim();
            if (/TRIPS-[A-Z0-9-]+/i.test(t)) return t;
          }
          for (const c of node.childNodes) {
            if (c.nodeType === Node.ELEMENT_NODE) {
              const found = walk(c as Element);
              if (found) return found;
            }
          }
          return "";
        };
        return walk(el);
      }).catch(() => "");
    }
    const tripId = extractTripId(tripIdRaw);
    const id = tripId || `trip-${i}`;

    // Cities in sequence: all .text-small.text-pill p in order (exclude "View System logs")
    const cityNames = await card.$$eval(listSelectors.cityName, (nodes) =>
      nodes.map((n) => (n as HTMLElement).innerText?.trim() ?? "").filter(Boolean)
    ).catch(() => ([] as string[]));
    const filteredCities = cityNames.filter((c) => !/view\s+system\s+logs/i.test(c));
    const citiesSequence = filteredCities.join(" → ");
    const location = citiesSequence || (await text(listSelectors.locationName).catch(() => ""));

    const safeTitle = (title ?? "").trim();
    const safeLocation = isViewSystemLogs(location) ? "" : location;
    const safeCities = isViewSystemLogs(citiesSequence) ? "" : citiesSequence;

    items.push({
      id,
      tripId: tripId || id,
      title: isViewSystemLogs(safeTitle) ? "" : safeTitle,
      citiesSequence: safeCities || safeLocation,
      location: safeLocation,
      imageUrl: imageUrl ?? "",
      startDate,
      endDate,
      dateDisplay: dateDisplay?.trim() ?? "",
    });
  }
  return items;
}

/** Returns true if there is a next page (Next button not disabled) */
async function hasNextPage(page: Page): Promise<boolean> {
  const nextBtn = await page.$(listSelectors.nextButton).catch(() => null);
  if (!nextBtn) return false;
  const disabled = await nextBtn.getAttribute("disabled").catch(() => null);
  return disabled === null;
}

/** Click Next and wait for content to update */
async function goToNextPage(page: Page): Promise<boolean> {
  const nextBtn = await page.$(listSelectors.nextButton).catch(() => null);
  if (!nextBtn) return false;
  const disabled = await nextBtn.getAttribute("disabled").catch(() => null);
  if (disabled !== null) return false;
  await nextBtn.click().catch(() => {});
  await new Promise((r) => setTimeout(r, PAGINATION_WAIT_MS));
  return true;
}

export async function scrapeTripsList(page: Page, listUrl: string): Promise<ScrapedTripItem[]> {
  await page.goto(listUrl, { waitUntil: "commit", timeout: GOTO_TIMEOUT_MS });
  await page.waitForSelector(listSelectors.cardContainer, { timeout: 20000 }).catch(() => null);
  await new Promise((r) => setTimeout(r, 2000));

  const allItems: ScrapedTripItem[] = [];
  let pageNum = 1;
  const maxPages = 50;

  while (pageNum <= maxPages) {
    const pageItems = await scrapePageItems(page);
    for (const item of pageItems) {
      if (item.tripId || item.title) allItems.push(item);
    }
    const hasNext = await hasNextPage(page);
    if (!hasNext) break;
    const went = await goToNextPage(page);
    if (!went) break;
    pageNum++;
  }

  return allItems;
}
