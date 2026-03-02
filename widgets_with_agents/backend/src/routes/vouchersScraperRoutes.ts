import { Router, type Request, type Response } from "express";
import { runVouchersListScraper, runVoucherDetailScraper } from "../scrapers/vouchers/index.js";
import { heimdallApprove, heimdallDecline } from "../services/heimdallVoucherApi.js";
import { getDiceAuthStatePath } from "../config/diceAuthPath.js";

export const vouchersScraperRoutes = Router();

vouchersScraperRoutes.get("/widgets/vouchers", async (_req: Request, res: Response) => {
  try {
    const items = await runVouchersListScraper();
    const hint =
      items.length === 0 && !getDiceAuthStatePath()
        ? "No vouchers found. Sign in to Dice in the app to scrape expense vouchers."
        : undefined;
    res.json({ items, hint });
  } catch (err) {
    const isTimeout =
      err instanceof Error && (err.name === "TimeoutError" || /timeout/i.test(err.message));
    console.error("Vouchers list scraper error:", err);
    if (isTimeout) {
      res.status(200).json({
        items: [],
        hint: "The vouchers page took too long to load. Check your connection and Dice auth.",
      });
      return;
    }
    res.status(500).json({ error: "Failed to fetch vouchers" });
  }
});

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
