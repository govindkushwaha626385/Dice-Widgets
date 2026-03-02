import type { Request, Response } from "express";
import OpenAI from "openai";
import { supabaseAdmin, isSupabaseConfigured } from "../config/supabase.js";
import { runExpensesListScraper } from "../scrapers/expenses/index.js";
import { getAnalysisChartData } from "../services/analysisChartData.js";

const thesysApiKey = (process.env.THESYS_API_KEY ?? "").trim();
const THESYS_BASE = "https://api.thesys.dev/v1/embed";
const C1_MODEL = "c1/anthropic/claude-sonnet-4/v-20251230";

const ANALYSIS_SYSTEM_PROMPT = `You are an analyst for a Personal Assistant dashboard. The user's application data is provided below.

Data sources:
- expenses: from the transaction UI (id, service, amount, transactionDate, submissionDate, createdBy, type)
- vouchers, trips, purchase_requisitions, notes: from the database (when configured)

Your task is to analyze this data and present insights using the C1 DSL with:
1. Summary cards: totals (e.g. total expense amount, voucher count, trip count, PR count), key numbers.
2. Tables: where useful (e.g. top expenses by amount, recent trips, PRs by status).
3. Charts: use C1 chart components wherever they add value:
   - Bar or pie charts for breakdowns (e.g. expenses by service/type, vouchers/trips/PRs by status).
   - Line or bar charts for trends (e.g. spending over time if dates are available).
   Use the chart DSL (e.g. type "chart", variant "bar" | "line" | "pie", data with labels and values).
4. Short bullet points for notable patterns or recommendations.

Cover: Expenses (spending, by service/type, dates), Vouchers (totals, status), Trips (count, dates, status), Purchase Requisitions (status breakdown), and Notes if present. Be concise and visual.`;

export function isThesysConfigured(): boolean {
  return !!thesysApiKey;
}

/** POST /api/chat/c1 — C1 Thesys chat (returns dynamic UI payload). */
export async function postChatC1(req: Request, res: Response): Promise<void> {
  if (!isThesysConfigured()) {
    res.status(503).json({
      error: "C1 Thesys not configured. Add THESYS_API_KEY to backend/.env",
      choices: null,
    });
    return;
  }

  const messages = req.body?.messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: "messages array is required", choices: null });
    return;
  }

  try {
    const client = new OpenAI({ apiKey: thesysApiKey, baseURL: THESYS_BASE });
    const completion = await client.chat.completions.create({
      model: C1_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are a helpful personal assistant. The user has a dashboard with expenses, trips, vouchers, purchase requisitions, notes, emails, calendar, and tasks. When appropriate, use dynamic UI elements (cards, tables, lists) to present information clearly. Be concise and friendly.",
        },
        ...messages,
      ],
      max_tokens: 2000,
      stream: false,
    });

    res.json({
      choices: completion.choices,
      usage: completion.usage,
      id: completion.id,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Thesys C1 request failed";
    console.error("[Thesys C1]", msg);
    res.status(500).json({ error: msg, choices: null });
  }
}

/** POST /api/analysis — Analyze all app data for the user via C1, return dynamic UI. */
export async function postAnalysis(req: Request, res: Response): Promise<void> {
  if (!isThesysConfigured()) {
    res.status(503).json({
      error: "C1 Thesys not configured. Add THESYS_API_KEY to backend/.env",
      choices: null,
    });
    return;
  }

  const userId = (req.body?.userId ?? req.headers["x-user-id"]) as string | undefined;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized. Send userId in body or x-user-id header.", choices: null });
    return;
  }

  try {
    const scrapedExpenses = await runExpensesListScraper().catch((err) => {
      console.warn("[Analysis] Expenses scraper failed, using empty list:", err?.message ?? err);
      return [];
    });

    let trips: { data: unknown[] | null } = { data: [] };
    let vouchers: { data: unknown[] | null } = { data: [] };
    let prs: { data: unknown[] | null } = { data: [] };
    let notes: { data: unknown[] | null } = { data: [] };

    if (isSupabaseConfigured() && supabaseAdmin) {
      const [tripsR, vouchersR, prsR, notesR] = await Promise.all([
        supabaseAdmin.from("trips").select("*").eq("user_id", userId).order("start_date", { ascending: false }),
        supabaseAdmin.from("vouchers").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
        supabaseAdmin.from("purchase_requisitions").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
        supabaseAdmin.from("notes").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      ]);
      trips = tripsR;
      vouchers = vouchersR;
      prs = prsR;
      notes = notesR;
    }

    const dataSummary = {
      expenses: scrapedExpenses,
      trips: trips.data ?? [],
      vouchers: vouchers.data ?? [],
      purchase_requisitions: prs.data ?? [],
      notes: notes.data ?? [],
    };

    const client = new OpenAI({ apiKey: thesysApiKey, baseURL: THESYS_BASE });
    const completion = await client.chat.completions.create({
      model: C1_MODEL,
      messages: [
        { role: "system", content: ANALYSIS_SYSTEM_PROMPT },
        {
          role: "user",
          content: `Analyze this application data and show insights with summary cards, tables, and charts:\n\n${JSON.stringify(dataSummary, null, 2)}`,
        },
      ],
      max_tokens: 4000,
      stream: false,
    });

    res.json({
      choices: completion.choices,
      usage: completion.usage,
      id: completion.id,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Analysis request failed";
    console.error("[Analysis]", msg);
    res.status(500).json({ error: msg, choices: null });
  }
}

/** POST /api/analysis/chart-data — Aggregated data for charts per widget (Expenses, Vouchers, Trips, PRs). */
export async function postAnalysisChartData(req: Request, res: Response): Promise<void> {
  const userId = (req.body?.userId ?? req.headers["x-user-id"]) as string | undefined;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized. Send userId in body or x-user-id header." });
    return;
  }
  try {
    const data = await getAnalysisChartData(userId);
    res.json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Chart data failed";
    console.error("[Analysis chart-data]", msg);
    res.status(500).json({ error: msg });
  }
}
