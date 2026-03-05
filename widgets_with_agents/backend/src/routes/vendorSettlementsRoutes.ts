/**
 * Vendor Settlements API routes (mounted under /api).
 * List from scraper (corporate.dice.tech/app/settlements/vendor), fallback to mock.
 * Mark Settled (log.ledger), Payout (payout.ledger), Hold (hold) via Heimdall.
 */

import { Router, type Request, type Response } from "express";
import {
  heimdallVendorSettlementMarkSettled,
  heimdallVendorSettlementPayout,
  heimdallVendorSettlementHold,
} from "../services/heimdallSettlementsApi.js";
import { runVendorSettlementsListScraper } from "../scrapers/vendorSettlements/index.js";
import { getDiceAuthStatePath } from "../config/diceAuthPath.js";

export const vendorSettlementsRoutes = Router();

const MOCK_ITEMS = [
  { ledgerId: "LEDGER-INTERN-000000717", vendorName: "Vendor One", description: "Sample", type: "POADVANCE", date: "04 Mar 2026", amount: "INR 5550" },
  { ledgerId: "LEDGER-INTERN-000000716", vendorName: "Vendor Two", description: "Sample", type: "POADVANCE", date: "04 Mar 2026", amount: "INR 1200" },
  { ledgerId: "LEDGER-INTERN-000000714", vendorName: "Vendor Three", description: "Sample", type: "POADVANCE", date: "03 Mar 2026", amount: "INR 800" },
];

const SCRAPER_TIMEOUT_MS = 90_000; // 90s so list + pagination can complete

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms)
    ),
  ]);
}

// GET /api/widgets/vendor-settlements — list from scraper (fallback to mock)
vendorSettlementsRoutes.get("/widgets/vendor-settlements", async (_req: Request, res: Response) => {
  try {
    const items = await withTimeout(
      runVendorSettlementsListScraper(),
      SCRAPER_TIMEOUT_MS,
      "Vendor settlements scraper"
    );
    const hint =
      items.length === 0 && !getDiceAuthStatePath()
        ? "No vendor settlements found. Sign in to Dice in the app to scrape."
        : items.length === 0
          ? "No vendor settlements on this page. Sign in to Dice and try again."
          : undefined;
    res.json({ items, hint });
  } catch (err) {
    const isTimeout =
      err instanceof Error && (err.name === "TimeoutError" || /timeout/i.test(err.message));
    console.error("Vendor settlements list scraper error:", err);
    if (isTimeout) {
      res.status(200).json({
        items: [],
        hint: "The vendor settlements page took too long to load. Check your connection and Dice auth, then refresh.",
      });
      return;
    }
    res.status(200).json({
      items: MOCK_ITEMS,
      hint: "Using sample data. Mark Settled / Payout / Hold require real data—sign in to Dice and refresh to load settlements from corporate.dice.tech.",
    });
  }
});

// POST /api/widgets/vendor-settlements/:ledgerId/log.ledger — Mark Settled
vendorSettlementsRoutes.post(
  "/widgets/vendor-settlements/:ledgerId/log.ledger",
  async (req: Request, res: Response) => {
    const ledgerId = req.params.ledgerId?.trim();
    if (!ledgerId) {
      res.status(400).json({ error: "Ledger ID required" });
      return;
    }
    const body = typeof req.body === "object" && req.body !== null ? req.body : {};
    try {
      const result = await heimdallVendorSettlementMarkSettled(ledgerId, body);
      if (!result.success) {
        res.status(400).json({ error: result.message ?? "Mark settled failed" });
        return;
      }
      res.json({ success: true, message: result.message ?? "Marked as settled successfully." });
    } catch (err) {
      console.error("Vendor settlement mark settled error:", err);
      res.status(500).json({ error: "Failed to mark as settled" });
    }
  }
);

// POST /api/widgets/vendor-settlements/:ledgerId/payout.ledger — Payout
vendorSettlementsRoutes.post(
  "/widgets/vendor-settlements/:ledgerId/payout.ledger",
  async (req: Request, res: Response) => {
    const ledgerId = req.params.ledgerId?.trim();
    if (!ledgerId) {
      res.status(400).json({ error: "Ledger ID required" });
      return;
    }
    const body = typeof req.body === "object" && req.body !== null ? req.body : {};
    try {
      const result = await heimdallVendorSettlementPayout(ledgerId, body);
      if (!result.success) {
        res.status(400).json({ error: result.message ?? "Payout failed" });
        return;
      }
      res.json({ success: true, message: result.message ?? "Sent to payout successfully." });
    } catch (err) {
      console.error("Vendor settlement payout error:", err);
      res.status(500).json({ error: "Failed to send to payout" });
    }
  }
);

// POST /api/widgets/vendor-settlements/:ledgerId/hold — Hold (body: { remark } required)
vendorSettlementsRoutes.post(
  "/widgets/vendor-settlements/:ledgerId/hold",
  async (req: Request, res: Response) => {
    const ledgerId = req.params.ledgerId?.trim();
    if (!ledgerId) {
      res.status(400).json({ error: "Ledger ID required" });
      return;
    }
    const remark = typeof req.body?.remark === "string" ? req.body.remark.trim() : "";
    if (!remark) {
      res.status(400).json({ error: "Remark is required for hold" });
      return;
    }
    const body = { remark };
    try {
      const result = await heimdallVendorSettlementHold(ledgerId, body);
      if (!result.success) {
        res.status(400).json({ error: result.message ?? "Hold failed" });
        return;
      }
      res.json({ success: true, message: result.message ?? "Settlement put on hold successfully." });
    } catch (err) {
      console.error("Vendor settlement hold error:", err);
      res.status(500).json({ error: "Failed to put on hold" });
    }
  }
);
