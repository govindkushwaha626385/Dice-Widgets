/**
 * Trips API routes (mounted under /api).
 * List and detail scraped from corporate.dice.tech/app/travel/trips.
 */

import { Router, type Request, type Response } from "express";
import { runTripsListScraper, runTripDetailScraper } from "../scrapers/trips/index.js";
import { heimdallDeleteTrip } from "../services/heimdallTripApi.js";
import { getDiceAuthStatePath } from "../config/diceAuthPath.js";
import { runWithRetry } from "../lib/runWithRetry.js";

export const tripsScraperRoutes = Router();

const SCRAPER_TIMEOUT_MS = 150_000; // 2.5 min — scraping can be slow on corporate.dice.tech

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms)
    ),
  ]);
}

// GET /api/widgets/trips — list all trips (scraped, with pagination)
tripsScraperRoutes.get("/widgets/trips", async (_req: Request, res: Response) => {
  try {
    const items = await withTimeout(
      runWithRetry(() => runTripsListScraper()),
      SCRAPER_TIMEOUT_MS,
      "Trips scraper"
    );
    const hint =
      items.length === 0 && !getDiceAuthStatePath()
        ? "No trips found. Sign in to Dice in the app to scrape trips."
        : items.length === 0
          ? "No trips on this page, or the page took too long. Check connection and Dice auth, then refresh."
          : undefined;
    res.json({ items, hint });
  } catch (err) {
    console.error("Trips list scraper error:", err);
    res.status(200).json({
      items: [],
      hint: "Could not load trips (timeout or connection). Check your connection and that you're signed in to Dice, then refresh.",
    });
  }
});

// GET /api/widgets/trips/:id — trip detail (overview, itinerary, transactions)
tripsScraperRoutes.get("/widgets/trips/:id", async (req: Request, res: Response) => {
  const id = req.params.id?.trim();
  if (!id) {
    res.status(400).json({ error: "Trip ID required" });
    return;
  }
  try {
    const detail = await runTripDetailScraper(id);
    if (!detail) {
      res.status(404).json({ error: "Trip detail not found" });
      return;
    }
    res.json(detail);
  } catch (err) {
    console.error("Trips detail scraper error:", err);
    res.status(500).json({ error: "Failed to fetch trip detail" });
  }
});

// DELETE /api/widgets/trips/:id — delete trip via Heimdall API (POST .../admin/trips/:id/delete)
tripsScraperRoutes.delete("/widgets/trips/:id", async (req: Request, res: Response) => {
  const id = req.params.id?.trim();
  if (!id) {
    res.status(400).json({ error: "Trip ID required" });
    return;
  }
  try {
    const result = await heimdallDeleteTrip(id);
    if (!result.success) {
      res.status(400).json({ error: result.message ?? "Delete failed" });
      return;
    }
    res.json({ ok: true, message: result.message ?? "Trip deleted successfully." });
  } catch (err) {
    console.error("Trips delete error:", err);
    res.status(500).json({ error: "Failed to delete trip" });
  }
});
