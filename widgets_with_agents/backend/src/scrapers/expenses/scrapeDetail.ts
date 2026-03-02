/**
 * Scrapes a single transaction detail page (with ?_id=...) for details and timeline.
 * Uses selectors from selectors.ts for easy updates when the DOM changes.
 */
import type { Page } from "playwright";
import { detailSelectors } from "./selectors.js";

export interface ScrapedExpenseDetail {
  id: string;
  heading: string;
  amount: string;
  details: Record<string, string>;
  timeline: Array<{ title: string; meta?: string; time?: string }>;
}

function getDetailUrl(baseUrl: string, id: string): string {
  const url = new URL(baseUrl);
  url.searchParams.set("_id", id);
  return url.toString();
}

export async function scrapeExpenseDetail(
  page: Page,
  baseUrl: string,
  expenseId: string
): Promise<ScrapedExpenseDetail | null> {
  const url = getDetailUrl(baseUrl, expenseId);
  await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForSelector(detailSelectors.sidepane, { timeout: 15000 }).catch(() => null);

  const heading = await page
    .$(detailSelectors.heading)
    .then((el) => (el ? el.evaluate((e) => (e as HTMLElement).innerText?.trim() ?? "") : ""))
    .catch(() => "");
  const amountEl = await page.$(detailSelectors.amountHeading);
  let amount = "";
  if (amountEl) {
    const parts = await amountEl.$$eval("span, *", (nodes) =>
      nodes.map((n) => (n as HTMLElement).innerText?.trim()).filter(Boolean)
    ).catch(() => []);
    amount = parts.join(" ").trim();
  }

  const details: Record<string, string> = {};
  const blocks = await page.$$(detailSelectors.detailBlock);
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
      return { label, value };
    }).catch(() => ({ label: "", value: "" }));
    if (pair.label) details[pair.label.replace(/\s+/g, " ").trim()] = pair.value;
  }

  const timeline: Array<{ title: string; meta?: string; time?: string }> = [];
  let timelineTab = page.getByRole("tab", { name: /timeline/i }).first();
  let tabVisible = await timelineTab.isVisible().catch(() => false);
  if (!tabVisible) {
    timelineTab = page.getByText(/^timeline$/i).first();
    tabVisible = await timelineTab.isVisible().catch(() => false);
  }
  if (tabVisible) {
    await timelineTab.click().catch(() => null);
    await page.waitForSelector(detailSelectors.timelineContainer, { timeout: 5000 }).catch(() => null);
    await new Promise((r) => setTimeout(r, 1000));
  }
  const timelineItems = await page.$$(detailSelectors.timelineItem);
  for (const item of timelineItems) {
    const textOf = (sel: string) =>
      item.$(sel).then((el) => (el ? el.evaluate((e) => (e as HTMLElement).innerText?.trim() ?? "") : "")).catch(() => "");
    const title = await textOf(detailSelectors.timelineTitle);
    const meta = await textOf(detailSelectors.timelineMeta);
    const time = await textOf(detailSelectors.timelineTime);
    timeline.push({ title, meta, time });
  }

  return {
    id: expenseId,
    heading,
    amount,
    details,
    timeline,
  };
}
