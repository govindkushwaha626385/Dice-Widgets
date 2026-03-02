/**
 * Scrapes a single voucher detail page for details, employee info, summary, and timeline.
 */
import type { Page } from "playwright";
import { detailSelectors } from "./selectors.js";

export interface ScrapedVoucherDetail {
  id: string;
  voucherDetails: Record<string, string>;
  employeeDetails: Record<string, string>;
  totalVoucherAmount: string;
  totalReimbursedAmount: string;
  voucherStatus: string;
  transactionCount: string;
  timeline: Array<{ title: string; meta?: string; time?: string }>;
}

function getDetailUrl(origin: string, voucherId: string): string {
  const base = origin.replace(/\/+$/, "");
  return `${base}/app/voucher/${encodeURIComponent(voucherId)}/details`;
}

/** Extract label-value pairs from a container (p = label, next/following div = value) */
async function extractKeyValueSection(
  page: Page,
  container: string
): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  const blocks = await page.$$(`${container} .row [class*="col-"]`).catch(() => []);
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
    if (pair.label) out[pair.label] = pair.value;
  }
  return out;
}

export async function scrapeVoucherDetail(
  page: Page,
  origin: string,
  voucherId: string
): Promise<ScrapedVoucherDetail | null> {
  const url = getDetailUrl(origin, voucherId);
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForSelector(detailSelectors.overview, { timeout: 15000 }).catch(() => null);

  const voucherDetails: Record<string, string> = {};
  const employeeDetails: Record<string, string> = {};

  const allSections = await page.$$("h6.heading-sm").catch(() => []);
  let currentSection = "";
  for (const h of allSections) {
    const heading = await h.evaluate((e) => (e as HTMLElement).innerText?.trim() ?? "").catch(() => "");
    const parent = await h.evaluateHandle((e) => e.closest(".row")?.parentElement ?? e.parentElement).catch(() => null);
    if (!parent) continue;
    const parentSel = await parent.evaluate((el) => {
      if (!el || !el.id) return "";
      return `#${el.id}`;
    }).catch(() => "");
    const container = (parentSel && parentSel.startsWith("#")) ? parentSel : detailSelectors.overview;
    const pairs = await extractKeyValueSection(page, container);
    if (/voucher details/i.test(heading)) {
      Object.assign(voucherDetails, pairs);
      currentSection = "voucher";
    } else if (/employee details/i.test(heading)) {
      Object.assign(employeeDetails, pairs);
      currentSection = "employee";
    } else if (currentSection === "voucher" && Object.keys(voucherDetails).length === 0) {
      Object.assign(voucherDetails, pairs);
    } else if (currentSection === "employee" && Object.keys(employeeDetails).length === 0) {
      Object.assign(employeeDetails, pairs);
    }
  }

  if (Object.keys(voucherDetails).length === 0 && Object.keys(employeeDetails).length === 0) {
    const fallback = await extractKeyValueSection(page, detailSelectors.overview);
    Object.assign(voucherDetails, fallback);
  }

  let totalVoucherAmount = "";
  let totalReimbursedAmount = "";
  let voucherStatus = "";
  let transactionCount = "";
  const summaryText = await page.evaluate(() => {
    const body = document.body.innerText;
    const amtMatch = body.match(/TOTAL VOUCHER AMOUNT[^\d]*([^\n]+)/i);
    const reimbMatch = body.match(/TOTAL REIMBURSED AMOUNT[^\d]*([^\n]+)/i);
    const statusMatch = body.match(/VOUCHER STATUS[^\n]*\n([^\n]+)/i);
    const countMatch = body.match(/TOTAL TRANSACTION COUNT[^\d]*([^\n]+)/i);
    return {
      amount: amtMatch ? amtMatch[1].trim() : "",
      reimbursed: reimbMatch ? reimbMatch[1].trim() : "",
      status: statusMatch ? statusMatch[1].trim() : "",
      count: countMatch ? countMatch[1].trim() : "",
    };
  }).catch((): { amount: string; reimbursed: string; status: string; count: string } => ({
    amount: "", reimbursed: "", status: "", count: "",
  }));
  totalVoucherAmount = summaryText.amount ?? "";
  totalReimbursedAmount = summaryText.reimbursed ?? "";
  voucherStatus = summaryText.status ?? "";
  transactionCount = summaryText.count ?? "";

  const timeline: Array<{ title: string; meta?: string; time?: string }> = [];
  const timelineItems = await page.$$(
    ".timeline-item, [class*='timeline'] li, [class*='timeline'] [class*='item']"
  ).catch(() => []);
  for (const item of timelineItems) {
    const title = await item.$eval("div, span, p", (el) => (el as HTMLElement).innerText?.trim() ?? "").catch(() => "");
    const meta = await item.$$eval("[class*='meta'], [class*='remark']", (nodes) =>
      nodes.map((n) => (n as HTMLElement).innerText?.trim()).filter(Boolean).join(" ")
    ).catch(() => "");
    const time = await item.$$eval("[class*='time'], [class*='date']", (nodes) =>
      nodes.map((n) => (n as HTMLElement).innerText?.trim()).filter(Boolean).join(" ")
    ).catch(() => "");
    if (title || meta || time) timeline.push({ title, meta: meta || undefined, time: time || undefined });
  }

  return {
    id: voucherId,
    voucherDetails,
    employeeDetails,
    totalVoucherAmount,
    totalReimbursedAmount,
    voucherStatus,
    transactionCount,
    timeline,
  };
}

/** Click Approve or Decline on the voucher detail page. Call after loading detail page. */
export async function clickVoucherAction(
  page: Page,
  action: "approve" | "decline"
): Promise<{ success: boolean; message?: string }> {
  const btnSel = action === "approve" ? detailSelectors.approveBtn : detailSelectors.declineBtn;
  const btn = await page.$(btnSel).catch(() => null);
  if (!btn) {
    return { success: false, message: `${action} button not found` };
  }
  const isDisabled = await btn.getAttribute("disabled").catch(() => null);
  if (isDisabled !== null) {
    return { success: false, message: `${action} button is disabled` };
  }
  await btn.click().catch(() => null);
  await new Promise((r) => setTimeout(r, 2000));
  return { success: true };
}
