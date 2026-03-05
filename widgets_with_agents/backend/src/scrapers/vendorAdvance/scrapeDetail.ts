/**
 * Scrapes Vendor Advance detail from the side panel (open by clicking View on list).
 * List page: https://corporate.dice.tech/app/vendor/advance
 */
import type { Page } from "playwright";
import { listSelectors, detailSelectors } from "./selectors.js";

export interface VendorAdvanceDetailFields {
  advanceId?: string;
  baseAmount?: string;
  taxAmount?: string;
  tdsPercent?: string;
  tdsDescription?: string;
  category?: string;
  remarks?: string;
  advanceAmount?: string;
  [key: string]: string | undefined;
}

export interface VendorAdvanceTimelineEvent {
  title: string;
  submittedBy?: string;
  type?: string;
  sentOn?: string;
  approvedOn?: string;
  text: string;
}

export interface ScrapedVendorAdvanceDetail {
  id: string;
  numericId?: number;
  advanceDetails: VendorAdvanceDetailFields;
  timeline: VendorAdvanceTimelineEvent[];
}

const LIST_WAIT_MS = 3000;
const PANEL_WAIT_MS = 4000;
const GOTO_TIMEOUT_MS = 45000;

/** Build candidate ids so we match row whether list shows "INTERN-00019" or "VC_ADVANCE-INTERN-00019" */
function candidateAdvanceIds(advanceId: string): string[] {
  const id = (advanceId || "").trim();
  if (!id) return [];
  const candidates = [id];
  if (!/^VC_ADVANCE-/i.test(id)) candidates.push("VC_ADVANCE-" + id);
  const withoutPrefix = id.replace(/^VC_ADVANCE-?/i, "").trim();
  if (withoutPrefix && withoutPrefix !== id) candidates.push(withoutPrefix);
  return [...new Set(candidates)];
}

/** Click View on the row that contains the given advance id (string id like VC_ADVANCE-INTERN-00022) */
async function clickViewForAdvance(page: Page, advanceId: string): Promise<boolean> {
  const rows = await page.$$(listSelectors.row).catch(() => []) ||
    await page.$$(listSelectors.rowFallback).catch(() => []);
  const candidates = candidateAdvanceIds(advanceId);
  for (const row of rows) {
    const cellText = await row.$eval("td:nth-child(1)", (el) => (el as HTMLElement).innerText?.trim() ?? "").catch(() => "");
    const matches = candidates.some((c) => c && cellText.includes(c));
    if (!matches) continue;
    const viewBtn = await row.$(listSelectors.viewButton).catch(() => null);
    if (!viewBtn) continue;
    await viewBtn.click().catch(() => null);
    return true;
  }
  return false;
}

/** Extract numeric id from side panel (e.g. from link or data attribute) */
async function extractNumericIdFromPanel(page: Page): Promise<number | undefined> {
  return page.evaluate(() => {
    const body = document.body.innerHTML;
    const m = body.match(/\/advance\/(\d+)/);
    return m ? parseInt(m[1], 10) : undefined;
  }).catch(() => undefined);
}

/** Scrape Advance Details section: label-value pairs */
async function extractAdvanceDetails(page: Page): Promise<VendorAdvanceDetailFields> {
  const out: VendorAdvanceDetailFields = {};
  const blocks = await page.$$(detailSelectors.detailBlock).catch(() => []);
  for (const block of blocks) {
    const pair = await block.evaluate((el) => {
      const p = el.querySelector("p");
      const label = p?.textContent?.trim() ?? "";
      const divs = el.querySelectorAll(":scope > div");
      let value = "";
      for (const d of divs) {
        const t = (d as HTMLElement).textContent?.trim() ?? "";
        if (t && t !== label) {
          value = t;
          break;
        }
      }
      if (!value && p?.nextElementSibling) {
        value = (p.nextElementSibling as HTMLElement).textContent?.trim() ?? "";
      }
      return { label: label.replace(/\s+/g, " ").trim(), value: value.replace(/\s+/g, " ").trim() };
    }).catch(() => ({ label: "", value: "" }));
    if (pair.label) {
      const key = pair.label.replace(/\s*:\s*$/, "").replace(/\s+/g, "");
      out[key] = pair.value;
      if (pair.label.toLowerCase().includes("advance id")) out.advanceId = pair.value;
      if (pair.label.toLowerCase().includes("base amount")) out.baseAmount = pair.value;
      if (pair.label.toLowerCase().includes("tax amount")) out.taxAmount = pair.value;
      if (pair.label.toLowerCase().includes("tds %")) out.tdsPercent = pair.value;
      if (pair.label.toLowerCase().includes("tds description")) out.tdsDescription = pair.value;
      if (pair.label.toLowerCase().includes("category")) out.category = pair.value;
      if (pair.label.toLowerCase().includes("remarks")) out.remarks = pair.value;
      if (pair.label.toLowerCase().includes("advance amount")) out.advanceAmount = pair.value;
    }
  }
  return out;
}

/** Scrape Timeline: .stage .point-text */
async function extractTimeline(page: Page): Promise<VendorAdvanceTimelineEvent[]> {
  const stages = await page.$$(detailSelectors.timelineStage).catch(() => []);
  const events: VendorAdvanceTimelineEvent[] = [];
  for (const stage of stages) {
    const pointText = await stage.$(detailSelectors.pointText).catch(() => null);
    if (!pointText) continue;
    const text = await pointText.evaluate((el) => (el as HTMLElement).innerText?.trim() ?? "").catch(() => "");
    if (!text) continue;
    const lines = text.split("\n").map((s) => s.trim()).filter(Boolean);
    const title = lines[0] ?? "";
    let submittedBy = "";
    let type = "";
    let sentOn = "";
    let approvedOn = "";
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith("Submitted by")) submittedBy = line.replace(/^Submitted by\s*/i, "").trim();
      else if (line.startsWith("Type:")) type = line.replace(/^Type:\s*/i, "").trim();
      else if (line.startsWith("Sent on:")) sentOn = line.replace(/^Sent on:\s*/i, "").trim();
      else if (line.startsWith("Approved on")) approvedOn = line.replace(/^Approved on\s*:\s*/i, "").trim();
    }
    events.push({ title, submittedBy: submittedBy || undefined, type: type || undefined, sentOn: sentOn || undefined, approvedOn: approvedOn || undefined, text });
  }
  return events;
}

export async function scrapeVendorAdvanceDetail(
  page: Page,
  listUrl: string,
  advanceId: string
): Promise<ScrapedVendorAdvanceDetail | null> {
  await page.goto(listUrl, { waitUntil: "domcontentloaded", timeout: GOTO_TIMEOUT_MS });
  await page.waitForSelector(listSelectors.table, { timeout: 15000 }).catch(() => null);
  await new Promise((r) => setTimeout(r, LIST_WAIT_MS));

  const clicked = await clickViewForAdvance(page, advanceId);
  if (!clicked) return null;

  await page.waitForSelector(detailSelectors.sidepane, { timeout: 10000 }).catch(() => null);
  await new Promise((r) => setTimeout(r, PANEL_WAIT_MS));

  let numericId = await extractNumericIdFromPanel(page);
  if (numericId == null) {
    const url = page.url();
    const m = url.match(/\/advance\/(\d+)/);
    if (m) numericId = parseInt(m[1], 10);
  }
  const advanceDetails = await extractAdvanceDetails(page);
  const timeline = await extractTimeline(page);

  return {
    id: advanceId,
    numericId,
    advanceDetails,
    timeline,
  };
}
