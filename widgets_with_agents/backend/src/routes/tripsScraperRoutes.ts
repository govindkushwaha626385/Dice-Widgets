/**
 * Trips API routes (mounted under /api).
 * List and detail scraped from corporate.dice.tech/app/travel/trips.
 */

import { Router, type Request, type Response } from "express";
import { runTripsListScraper, runTripDetailScraper } from "../scrapers/trips/index.js";
import { heimdallDeleteTrip } from "../services/heimdallTripApi.js";
import { getDiceAuthStatePath } from "../config/diceAuthPath.js";

export const tripsScraperRoutes = Router();

// GET /api/widgets/trips — list all trips (scraped, with pagination)
tripsScraperRoutes.get("/widgets/trips", async (_req: Request, res: Response) => {
  try {
    const items = await runTripsListScraper();
    const hint =
      items.length === 0 && !getDiceAuthStatePath()
        ? "No trips found. Sign in to Dice in the app to scrape trips."
        : undefined;
    res.json({ items, hint });
  } catch (err) {
    const isTimeout =
      err instanceof Error && (err.name === "TimeoutError" || /timeout/i.test(err.message));
    console.error("Trips list scraper error:", err);
    if (isTimeout) {
      res.status(200).json({
        items: [],
        hint: "The trips page took too long to load. Check your connection and Dice auth.",
      });
      return;
    }
    res.status(500).json({ error: "Failed to fetch trips" });
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
