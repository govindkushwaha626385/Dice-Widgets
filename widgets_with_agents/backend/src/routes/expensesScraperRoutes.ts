import { Router, type Request, type Response } from "express";
import { runExpensesListScraper, runExpenseDetailScraper } from "../scrapers/expenses/index.js";

export const expensesScraperRoutes = Router();

expensesScraperRoutes.get("/widgets/expenses", async (_req: Request, res: Response) => {
  try {
    const items = await runExpensesListScraper();
    const hint =
      items.length === 0 && !process.env.DICE_AUTH_STATE_PATH
        ? "No rows found. The transaction site may require login — set DICE_AUTH_STATE_PATH in backend/.env (see backend/src/scrapers/expenses/README.md)."
        : undefined;
    res.json({ items, hint });
  } catch (err) {
    const isTimeout =
      err instanceof Error && (err.name === "TimeoutError" || /timeout/i.test(err.message));
    console.error("Expenses list scraper error:", err);
    if (isTimeout) {
      res.status(200).json({
        items: [],
        hint:
          "The transaction page took too long to load. Check your connection and that auth is set up (DICE_AUTH_STATE_PATH).",
      });
      return;
    }
    res.status(500).json({ error: "Failed to fetch expenses" });
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
