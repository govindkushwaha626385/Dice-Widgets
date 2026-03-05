/**
 * Employee Settlements API routes (mounted under /api).
 * List from scraper (corporate.dice.tech/app/settlements/employee), fallback to mock.
 * Mark Settled (log.ledger), Payout (payout.ledger) via Heimdall.
 */

import { Router, type Request, type Response } from "express";
import {
  heimdallSettlementMarkSettled,
  heimdallSettlementPayout,
} from "../services/heimdallSettlementsApi.js";
import { runEmployeeSettlementsListScraper } from "../scrapers/employeeSettlements/index.js";
import { getDiceAuthStatePath } from "../config/diceAuthPath.js";

export const employeeSettlementsRoutes = Router();

const MOCK_ITEMS = [
  { ledgerId: "LEDGER-INTERN-000000711", employeeName: "Rajiv Tiwari", voucherNumber: "V-INTERN-000000224", entityName: "NA", type: "REIMBURSEMENT", date: "02 Mar 2026 16:03", amount: "INR 4000" },
  { ledgerId: "LEDGER-INTERN-000000715", employeeName: "Ishan Jain", voucherNumber: "V-INTERN-000000213", entityName: "NA", type: "REIMBURSEMENT", date: "02 Mar 2026 15:03", amount: "INR 5000" },
  { ledgerId: "LEDGER-INTERN-000000709", employeeName: "XYZ ABC", voucherNumber: "V-INTERN-000000216", entityName: "NA", type: "REIMBURSEMENT", date: "02 Mar 2026 14:00", amount: "INR 200" },
];

const SCRAPER_TIMEOUT_MS = 90_000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms)
    ),
  ]);
}

// GET /api/widgets/employee-settlements — list from scraper (fallback to mock)
employeeSettlementsRoutes.get("/widgets/employee-settlements", async (_req: Request, res: Response) => {
  try {
    const items = await withTimeout(
      runEmployeeSettlementsListScraper(),
      SCRAPER_TIMEOUT_MS,
      "Employee settlements scraper"
    );
    const hint =
      items.length === 0 && !getDiceAuthStatePath()
        ? "No settlements found. Sign in to Dice in the app to scrape."
        : items.length === 0
          ? "No employee settlements on this page. Sign in to Dice and try again."
          : undefined;
    res.json({ items, hint });
  } catch (err) {
    const isTimeout =
      err instanceof Error && (err.name === "TimeoutError" || /timeout/i.test(err.message));
    console.error("Employee settlements list scraper error:", err);
    if (isTimeout) {
      res.status(200).json({
        items: [],
        hint: "The employee settlements page took too long to load. Check your connection and Dice auth, then refresh.",
      });
      return;
    }
    res.status(200).json({
      items: MOCK_ITEMS,
      hint: "Using sample data. Mark Settled / Payout require real data—sign in to Dice and refresh to load from corporate.dice.tech.",
    });
  }
});

// POST /api/widgets/employee-settlements/:ledgerId/log.ledger — Mark Settled (body: paymentMode, utrOrChequeNumber, etc.)
employeeSettlementsRoutes.post(
  "/widgets/employee-settlements/:ledgerId/log.ledger",
  async (req: Request, res: Response) => {
    const ledgerId = req.params.ledgerId?.trim();
    if (!ledgerId) {
      res.status(400).json({ error: "Ledger ID required" });
      return;
    }
    const body = typeof req.body === "object" && req.body !== null ? req.body : {};
    try {
      const result = await heimdallSettlementMarkSettled(ledgerId, body);
      if (!result.success) {
        res.status(400).json({ error: result.message ?? "Mark settled failed" });
        return;
      }
      res.json({ success: true, message: result.message ?? "Marked as settled successfully." });
    } catch (err) {
      console.error("Employee settlement mark settled error:", err);
      res.status(500).json({ error: "Failed to mark as settled" });
    }
  }
);

// POST /api/widgets/employee-settlements/:ledgerId/payout.ledger — Payout (body: optional user input)
employeeSettlementsRoutes.post(
  "/widgets/employee-settlements/:ledgerId/payout.ledger",
  async (req: Request, res: Response) => {
    const ledgerId = req.params.ledgerId?.trim();
    if (!ledgerId) {
      res.status(400).json({ error: "Ledger ID required" });
      return;
    }
    const body = typeof req.body === "object" && req.body !== null ? req.body : {};
    try {
      const result = await heimdallSettlementPayout(ledgerId, body);
      if (!result.success) {
        res.status(400).json({ error: result.message ?? "Payout failed" });
        return;
      }
      res.json({ success: true, message: result.message ?? "Sent to payout successfully." });
    } catch (err) {
      console.error("Employee settlement payout error:", err);
      res.status(500).json({ error: "Failed to send to payout" });
    }
  }
);
