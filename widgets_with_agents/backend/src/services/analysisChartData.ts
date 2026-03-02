/**
 * Builds chart-ready aggregates for the Analysis widget (Expenses, Vouchers, Trips, PRs).
 * Expenses and Vouchers use scraped data; Trips and PRs use Supabase when configured.
 */

import { runExpensesListScraper } from "../scrapers/expenses/index.js";
import { runVouchersListScraper } from "../scrapers/vouchers/index.js";
import { runTripsListScraper } from "../scrapers/trips/index.js";
import { supabaseAdmin, isSupabaseConfigured } from "../config/supabase.js";

export interface ChartDataPoint {
  name: string;
  value: number;
}

export interface ExpensesChartData {
  byService: ChartDataPoint[];
  byType: ChartDataPoint[];
  byMonth: ChartDataPoint[];
  totalAmount: number;
  count: number;
}

export interface VouchersChartData {
  byType: ChartDataPoint[];
  byStatus: ChartDataPoint[];
  byOffice: ChartDataPoint[];
  byMonth: ChartDataPoint[];
  byTypeAmount: ChartDataPoint[];
  totalAmount: number;
  count: number;
}

export interface TripsChartData {
  byStatus: ChartDataPoint[];
  byMonth: ChartDataPoint[];
  count: number;
}

export interface PRsChartData {
  byStatus: ChartDataPoint[];
  count: number;
}

export interface AnalysisChartData {
  expenses: ExpensesChartData;
  vouchers: VouchersChartData;
  trips: TripsChartData;
  purchase_requisitions: PRsChartData;
}

function parseAmount(amountStr: string): number {
  const match = String(amountStr).replace(/,/g, "").match(/[\d.]+/);
  return match ? parseFloat(match[0]) || 0 : 0;
}

function monthKey(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "Other";
  const m = d.toLocaleString("en-US", { month: "short" });
  const y = d.getFullYear();
  return `${m} ${y}`;
}

function aggregateBy<T>(items: T[], getKey: (t: T) => string, getValue: (t: T) => number): ChartDataPoint[] {
  const map = new Map<string, number>();
  for (const item of items) {
    const k = getKey(item) || "Other";
    map.set(k, (map.get(k) ?? 0) + getValue(item));
  }
  return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

export async function getAnalysisChartData(userId: string): Promise<AnalysisChartData> {
  const emptyChart = (): ChartDataPoint[] => [];
  const emptyExpenses: ExpensesChartData = {
    byService: emptyChart(),
    byType: emptyChart(),
    byMonth: emptyChart(),
    totalAmount: 0,
    count: 0,
  };
  const emptyVouchers: VouchersChartData = {
    byType: emptyChart(),
    byStatus: emptyChart(),
    byOffice: emptyChart(),
    byMonth: emptyChart(),
    byTypeAmount: emptyChart(),
    totalAmount: 0,
    count: 0,
  };
  const emptyTrips: TripsChartData = {
    byStatus: emptyChart(),
    byMonth: emptyChart(),
    count: 0,
  };
  const emptyPRs: PRsChartData = {
    byStatus: emptyChart(),
    count: 0,
  };

  const expenses = await runExpensesListScraper().catch(() => []);
  const expenseAmounts = expenses.map((e) => ({ ...e, numericAmount: parseAmount(e.amount) }));
  const expenseByService = aggregateBy(expenseAmounts, (e) => e.service || "Other", (e) => e.numericAmount);
  const expenseByType = aggregateBy(expenseAmounts, (e) => e.type || "Other", (e) => e.numericAmount);
  const expenseByMonth = aggregateBy(
    expenseAmounts.filter((e) => e.transactionDate),
    (e) => monthKey(e.transactionDate),
    (e) => e.numericAmount
  );
  const expensesData: ExpensesChartData = {
    byService: expenseByService,
    byType: expenseByType,
    byMonth: expenseByMonth,
    totalAmount: expenseAmounts.reduce((s, e) => s + e.numericAmount, 0),
    count: expenses.length,
  };

  const vouchers = await runVouchersListScraper().catch(() => []);
  const voucherAmounts = vouchers.map((v) => ({ ...v, numericAmount: parseAmount(v.amount) }));
  const vouchersData: VouchersChartData = {
    byType: aggregateBy(voucherAmounts, (v) => v.voucherType || "Other", () => 1),
    byStatus: aggregateBy(voucherAmounts, (v) => v.claimed || "—", () => 1),
    byOffice: aggregateBy(voucherAmounts, (v) => v.office || "Other", () => 1),
    byMonth: aggregateBy(
      voucherAmounts.filter((v) => v.createdOn),
      (v) => monthKey(v.createdOn),
      () => 1
    ),
    byTypeAmount: aggregateBy(voucherAmounts, (v) => v.voucherType || "Other", (v) => v.numericAmount),
    totalAmount: voucherAmounts.reduce((s, v) => s + v.numericAmount, 0),
    count: vouchers.length,
  };

  // Trips: from scraper (no DB)
  const trips = await runTripsListScraper().catch(() => []);
  const tripsData: TripsChartData = {
    byStatus: emptyChart(),
    byMonth: aggregateBy(
      trips.filter((t) => t.startDate),
      (t) => monthKey(t.startDate),
      () => 1
    ),
    count: trips.length,
  };

  let prsData: PRsChartData = emptyPRs;
  if (isSupabaseConfigured() && supabaseAdmin) {
    const prsRes = await supabaseAdmin
      .from("purchase_requisitions")
      .select("status")
      .eq("user_id", userId);
    const prs = (prsRes.data ?? []) as Array<{ status: string }>;
    prsData = {
      byStatus: aggregateBy(prs, (p) => p.status || "Other", () => 1),
      count: prs.length,
    };
  }

  return {
    expenses: expensesData,
    vouchers: vouchersData,
    trips: tripsData,
    purchase_requisitions: prsData,
  };
}
