/**
 * Transfers & Accounts API routes (mounted under /api).
 * List from scraper (corporate.dice.tech/app/payout), Recall via Heimdall.
 */

import { Router, type Request, type Response } from "express";
import { heimdallRecallTransfer } from "../services/heimdallTransfersApi.js";
import { runPayoutListScraper } from "../scrapers/payout/index.js";
import { getDiceAuthStatePath } from "../config/diceAuthPath.js";

export const transfersAccountsRoutes = Router();

const SCRAPER_TIMEOUT_MS = 90_000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms)
    ),
  ]);
}

// GET /api/widgets/transfers-accounts — list from scraper
transfersAccountsRoutes.get("/widgets/transfers-accounts", async (_req: Request, res: Response) => {
  try {
    const items = await withTimeout(
      runPayoutListScraper(),
      SCRAPER_TIMEOUT_MS,
      "Transfers & Accounts scraper"
    );
    const hint =
      items.length === 0 && !getDiceAuthStatePath()
        ? "No transfers found. Sign in to Dice in the app to scrape."
        : items.length === 0
          ? "No transfers on this page. Sign in to Dice and try again."
          : undefined;
    res.json({ items, hint });
  } catch (err) {
    const isTimeout =
      err instanceof Error && (err.name === "TimeoutError" || /timeout/i.test(err.message));
    console.error("Transfers & Accounts list scraper error:", err);
    if (isTimeout) {
      res.status(200).json({
        items: [],
        hint: "The transfers page took too long to load. Check your connection and Dice auth, then refresh.",
      });
      return;
    }
    res.status(200).json({
      items: [],
      hint: "Could not load transfers. Sign in to Dice and refresh.",
    });
  }
});

// POST /api/widgets/transfers-accounts/:transferId/recall — Recall transfer
transfersAccountsRoutes.post(
  "/widgets/transfers-accounts/:transferId/recall",
  async (req: Request, res: Response) => {
    const transferId = req.params.transferId?.trim();
    if (!transferId) {
      res.status(400).json({ success: false, error: "Transfer ID required" });
      return;
    }
    try {
      const result = await heimdallRecallTransfer(transferId);
      if (!result.success) {
        res.status(400).json({ success: false, error: result.message ?? "Recall failed" });
        return;
      }
      res.json({ success: true, message: result.message ?? "Transfer recalled successfully." });
    } catch (err) {
      console.error("Transfers recall error:", err);
      res.status(500).json({ success: false, error: "Failed to recall transfer" });
    }
  }
);
