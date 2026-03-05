import { Router, type Request, type Response } from "express";
import { runExpensesListScraper, runExpenseDetailScraper } from "../scrapers/expenses/index.js";
import { getDiceAuthStatePath } from "../config/diceAuthPath.js";
import { runWithRetry } from "../lib/runWithRetry.js";

export const expensesScraperRoutes = Router();

const SCRAPER_TIMEOUT_MS = 150_000; // 2.5 min — scraping can be slow on corporate.dice.tech

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms)
    ),
  ]);
}

expensesScraperRoutes.get("/widgets/expenses", async (_req: Request, res: Response) => {
  try {
    const items = await withTimeout(
      runWithRetry(() => runExpensesListScraper()),
      SCRAPER_TIMEOUT_MS,
      "Expenses scraper"
    );
    const hint =
      items.length === 0 && !getDiceAuthStatePath()
        ? "No expenses found. Sign in to Dice in the app to scrape."
        : items.length === 0
          ? "No expenses on this page, or the page took too long. Check connection and Dice auth, then refresh."
          : undefined;
    res.json({ items, hint });
  } catch (err) {
    console.error("Expenses list scraper error:", err);
    res.status(200).json({
      items: [],
      hint: "Could not load expenses (timeout or connection). Check your connection and that you're signed in to Dice, then refresh.",
    });
  }
});

expensesScraperRoutes.get("/widgets/expenses/:id", async (req: Request, res: Response) => {
  const id = req.params.id;
  if (!id) {
    res.status(400).json({ error: "Expense ID required" });
    return;
  }
  try {
    const detail = await runExpenseDetailScraper(id);
    if (!detail) {
      res.status(404).json({ error: "Expense not found" });
      return;
    }
    res.json(detail);
  } catch (err) {
    console.error("Expense detail scraper error:", err);
    res.status(500).json({ error: "Failed to fetch expense detail" });
  }
});
