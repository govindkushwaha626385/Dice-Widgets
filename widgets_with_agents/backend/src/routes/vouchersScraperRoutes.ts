/**
 * Voucher API routes (mounted under /api).
 * List/detail come from scraper; approve/decline call Heimdall API.
 */

import { Router, type Request, type Response } from "express";
import { runVouchersListScraper, runVoucherDetailScraper } from "../scrapers/vouchers/index.js";
import { heimdallApprove, heimdallDecline } from "../services/heimdallVoucherApi.js";
import { getDiceAuthStatePath } from "../config/diceAuthPath.js";
import { runWithRetry } from "../lib/runWithRetry.js";

export const vouchersScraperRoutes = Router();

const SCRAPER_TIMEOUT_MS = 150_000; // 2.5 min — scraping can be slow on corporate.dice.tech

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms)
    ),
  ]);
}

// GET /api/widgets/vouchers — list vouchers (scraped)
vouchersScraperRoutes.get("/widgets/vouchers", async (_req: Request, res: Response) => {
  try {
    const items = await withTimeout(
      runWithRetry(() => runVouchersListScraper()),
      SCRAPER_TIMEOUT_MS,
      "Vouchers scraper"
    );
    const hint =
      items.length === 0 && !getDiceAuthStatePath()
        ? "No vouchers found. Sign in to Dice in the app to scrape expense vouchers."
        : items.length === 0
          ? "No vouchers on this page, or the page took too long. Check connection and Dice auth, then refresh."
          : undefined;
    res.json({ items, hint });
  } catch (err) {
    console.error("Vouchers list scraper error:", err);
    res.status(200).json({
      items: [],
      hint: "Could not load vouchers (timeout or connection). Check your connection and that you're signed in to Dice, then refresh.",
    });
  }
});

// GET /api/widgets/vouchers/:id — single voucher detail (scraped)
vouchersScraperRoutes.get("/widgets/vouchers/:id", async (req: Request, res: Response) => {
  const id = req.params.id;
  if (!id) {
    res.status(400).json({ error: "Voucher ID required" });
    return;
  }
  try {
    const detail = await runVoucherDetailScraper(id);
    if (!detail) {
      res.status(404).json({ error: "Voucher not found" });
      return;
    }
    res.json(detail);
  } catch (err) {
    console.error("Voucher detail scraper error:", err);
    res.status(500).json({ error: "Failed to fetch voucher detail" });
  }
});

// POST /api/widgets/vouchers/:id/approve — call Heimdall approve API
vouchersScraperRoutes.post("/widgets/vouchers/:id/approve", async (req: Request, res: Response) => {
  const id = req.params.id;
  if (!id) {
    res.status(400).json({ error: "Voucher ID required" });
    return;
  }
  try {
    const result = await heimdallApprove(id);
    if (!result.success) {
      console.error("Voucher approve API error:", result.message);
      res.status(400).json({ success: false, message: result.message ?? "Approve failed" });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    console.error("Voucher approve error:", err);
    const message = err instanceof Error ? err.message : "Failed to approve voucher";
    res.status(500).json({ success: false, message });
  }
});

// POST /api/widgets/vouchers/:id/decline — call Heimdall decline API (body: { remarks })
vouchersScraperRoutes.post("/widgets/vouchers/:id/decline", async (req: Request, res: Response) => {
  const id = req.params.id;
  if (!id) {
    res.status(400).json({ error: "Voucher ID required" });
    return;
  }
  const remarks = typeof req.body?.remarks === "string" ? req.body.remarks : "";
  try {
    const result = await heimdallDecline(id, remarks);
    if (!result.success) {
      console.error("Voucher decline API error:", result.message);
      res.status(400).json({ success: false, message: result.message ?? "Decline failed" });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    console.error("Voucher decline error:", err);
    const message = err instanceof Error ? err.message : "Failed to decline voucher";
    res.status(500).json({ success: false, message });
  }
});
