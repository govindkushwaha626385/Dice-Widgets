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

export const vendorAdvanceScraperRoutes = Router();

// GET /api/widgets/vendor-advances — list all vendor advances (scraped, with pagination)
vendorAdvanceScraperRoutes.get("/widgets/vendor-advances", async (_req: Request, res: Response) => {
  try {
    const items = await runVendorAdvancesListScraper();
    const hint =
      items.length === 0 && !getDiceAuthStatePath()
        ? "No vendor advances found. Sign in to Dice in the app to scrape."
        : undefined;
    res.json({ items, hint });
  } catch (err) {
    const isTimeout =
      err instanceof Error && (err.name === "TimeoutError" || /timeout/i.test(err.message));
    console.error("Vendor advances list scraper error:", err);
    if (isTimeout) {
      res.status(200).json({
        items: [],
        hint: "The vendor advance page took too long to load. Check your connection and Dice auth.",
      });
      return;
    }
    res.status(500).json({ error: "Failed to fetch vendor advances" });
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
