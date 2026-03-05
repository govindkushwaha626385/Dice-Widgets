/**
 * Vendor Advance API routes (mounted under /api).
 * List and detail from corporate.dice.tech/app/vendor/advance.
 */

import { Router, type Request, type Response } from "express";
import {
  runVendorAdvancesListScraper,
  runVendorAdvanceDetailScraper,
} from "../scrapers/vendorAdvance/index.js";
import { heimdallVendorAdvanceApprove, heimdallVendorAdvanceDecline } from "../services/heimdallVendorAdvanceApi.js";
import { getDiceAuthStatePath } from "../config/diceAuthPath.js";
import { runWithRetry } from "../lib/runWithRetry.js";

export const vendorAdvanceScraperRoutes = Router();

const SCRAPER_TIMEOUT_MS = 150_000; // 2.5 min — scraping can be slow on corporate.dice.tech

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms)
    ),
  ]);
}

// GET /api/widgets/vendor-advances — list all vendor advances (scraped, with pagination)
vendorAdvanceScraperRoutes.get("/widgets/vendor-advances", async (_req: Request, res: Response) => {
  try {
    const items = await withTimeout(
      runWithRetry(() => runVendorAdvancesListScraper()),
      SCRAPER_TIMEOUT_MS,
      "Vendor advances scraper"
    );
    const hint =
      items.length === 0 && !getDiceAuthStatePath()
        ? "No vendor advances found. Sign in to Dice in the app to scrape."
        : items.length === 0
          ? "No vendor advances on this page, or the page took too long. Check connection and Dice auth, then refresh."
          : undefined;
    res.json({ items, hint });
  } catch (err) {
    console.error("Vendor advances list scraper error:", err);
    res.status(200).json({
      items: [],
      hint: "Could not load vendor advances (timeout or connection). Check your connection and that you're signed in to Dice, then refresh.",
    });
  }
});

// GET /api/widgets/vendor-advances/:id — detail (advance details + timeline)
vendorAdvanceScraperRoutes.get("/widgets/vendor-advances/:id", async (req: Request, res: Response) => {
  const id = req.params.id?.trim();
  if (!id) {
    res.status(400).json({ error: "Vendor advance ID required" });
    return;
  }
  try {
    const detail = await runVendorAdvanceDetailScraper(id);
    if (!detail) {
      res.status(404).json({ error: "Vendor advance detail not found" });
      return;
    }
    res.json(detail);
  } catch (err) {
    console.error("Vendor advance detail scraper error:", err);
    res.status(500).json({ error: "Failed to fetch vendor advance detail" });
  }
});

// POST /api/widgets/vendor-advances/:numericId/approve — approve (numeric id from detail)
vendorAdvanceScraperRoutes.post("/widgets/vendor-advances/:numericId/approve", async (req: Request, res: Response) => {
  const numericId = parseInt(req.params.numericId ?? "", 10);
  if (!Number.isInteger(numericId) || numericId < 1) {
    res.status(400).json({ error: "Valid numeric ID required" });
    return;
  }
  try {
    const result = await heimdallVendorAdvanceApprove(numericId);
    if (!result.success) {
      res.status(400).json({ error: result.message ?? "Approve failed" });
      return;
    }
    res.json({ success: true, message: result.message ?? "Approved successfully." });
  } catch (err) {
    console.error("Vendor advance approve error:", err);
    res.status(500).json({ error: "Failed to approve" });
  }
});

// POST /api/widgets/vendor-advances/:numericId/decline — decline (body: { remarks })
vendorAdvanceScraperRoutes.post("/widgets/vendor-advances/:numericId/decline", async (req: Request, res: Response) => {
  const numericId = parseInt(req.params.numericId ?? "", 10);
  if (!Number.isInteger(numericId) || numericId < 1) {
    res.status(400).json({ error: "Valid numeric ID required" });
    return;
  }
  const remarks = typeof req.body?.remarks === "string" ? req.body.remarks.trim() : "";
  try {
    const result = await heimdallVendorAdvanceDecline(numericId, remarks);
    if (!result.success) {
      res.status(400).json({ error: result.message ?? "Decline failed" });
      return;
    }
    res.json({ success: true, message: result.message ?? "Declined successfully." });
  } catch (err) {
    console.error("Vendor advance decline error:", err);
    res.status(500).json({ error: "Failed to decline" });
  }
});
