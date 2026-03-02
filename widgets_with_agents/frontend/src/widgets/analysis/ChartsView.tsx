/**
 * Chart view: separate analysis per widget (Expenses, Vouchers, Trips, PRs) with Pie, Bar, Line, Area.
 */
import { useState, useEffect, useCallback } from "react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { apiFetch } from "../../lib/electronApi";
import type { AnalysisChartData, ChartDataPoint } from "./types";

const CHART_COLORS = ["#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899", "#6366f1", "#14b8a6", "#f97316"];

function ChartSection({
  title,
  data,
  valueLabel = "Value",
}: {
  title: string;
  data: ChartDataPoint[];
  valueLabel?: string;
}) {
  if (!data || data.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 text-center text-sm text-slate-500">
        {title} — No data
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h4>
      <div className="h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={70}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(v: number) => [v, valueLabel]} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function BarSection({
  title,
  data,
  valueLabel = "Value",
}: {
  title: string;
  data: ChartDataPoint[];
  valueLabel?: string;
}) {
  if (!data || data.length === 0) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h4>
      <div className="h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip formatter={(v: number) => [v, valueLabel]} />
            <Bar dataKey="value" fill="#f59e0b" radius={[4, 4, 0, 0]} name={valueLabel} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function LineSection({
  title,
  data,
  valueLabel = "Value",
}: {
  title: string;
  data: ChartDataPoint[];
  valueLabel?: string;
}) {
  if (!data || data.length === 0) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h4>
      <div className="h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip formatter={(v: number) => [v, valueLabel]} />
            <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} name={valueLabel} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function AreaSection({
  title,
  data,
  valueLabel = "Value",
}: {
  title: string;
  data: ChartDataPoint[];
  valueLabel?: string;
}) {
  if (!data || data.length === 0) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h4>
      <div className="h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip formatter={(v: number) => [v, valueLabel]} />
            <Area type="monotone" dataKey="value" stroke="#10b981" fill="#10b98133" strokeWidth={2} name={valueLabel} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

const WIDGET_TABS = [
  { id: "expenses" as const, label: "Expenses" },
  { id: "vouchers" as const, label: "Vouchers" },
  { id: "trips" as const, label: "Trips" },
  { id: "prs" as const, label: "Purchase requests" },
];

function SummaryCards({
  totalAmount,
  count,
  amountLabel = "Total amount",
  variant = "amber",
}: {
  totalAmount: number;
  count: number;
  amountLabel?: string;
  variant?: "amber" | "rose";
}) {
  const formatted =
    totalAmount > 0
      ? new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(
          totalAmount
        )
      : "—";
  const isRose = variant === "rose";
  return (
    <div className="grid grid-cols-2 gap-2 mb-3">
      <div
        className={`rounded-lg border px-3 py-2 ${
          isRose ? "border-rose-200/80 bg-rose-50/80" : "border-amber-200/80 bg-amber-50/80"
        }`}
      >
        <p className={`text-xs font-medium uppercase tracking-wide ${isRose ? "text-rose-800" : "text-amber-800"}`}>
          {amountLabel}
        </p>
        <p className={`text-lg font-bold tabular-nums ${isRose ? "text-rose-900" : "text-amber-900"}`}>{formatted}</p>
      </div>
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
        <p className="text-xs font-medium text-slate-600 uppercase tracking-wide">Count</p>
        <p className="text-lg font-bold text-slate-800 tabular-nums">{count}</p>
      </div>
    </div>
  );
}

interface ChartsViewProps {
  userId: string;
}

export function ChartsView({ userId }: ChartsViewProps) {
  const [chartData, setChartData] = useState<AnalysisChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<typeof WIDGET_TABS[number]["id"]>("expenses");

  const fetchChartData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch("/api/analysis/chart-data", {
        method: "POST",
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? "Failed to load chart data");
      }
      const data = (await res.json()) as AnalysisChartData;
      setChartData(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load charts");
      setChartData(null);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchChartData();
  }, [fetchChartData]);

  if (loading && !chartData) {
    return (
      <div className="flex items-center justify-center py-8 text-slate-500">
        <span className="animate-pulse">Loading chart data…</span>
      </div>
    );
  }

  if (error && !chartData) {
    return (
      <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
        {error}
        <button
          type="button"
          onClick={fetchChartData}
          className="ml-2 underline hover:no-underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!chartData) return null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1 border-b border-slate-200 pb-2">
        {WIDGET_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-amber-100 text-amber-800"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {activeTab === "expenses" && (
          <>
            <div className="sm:col-span-2">
              <SummaryCards
                totalAmount={chartData.expenses.totalAmount}
                count={chartData.expenses.count}
                amountLabel="Total expenses"
                variant="amber"
              />
            </div>
            <ChartSection title="By service (pie)" data={chartData.expenses.byService} valueLabel="Amount" />
            <BarSection title="By service (bar)" data={chartData.expenses.byService} valueLabel="Amount" />
            <LineSection title="By month (line)" data={chartData.expenses.byMonth} valueLabel="Amount" />
            <AreaSection title="By month (area)" data={chartData.expenses.byMonth} valueLabel="Amount" />
            <ChartSection title="By type (pie)" data={chartData.expenses.byType} valueLabel="Amount" />
            <BarSection title="By type (bar)" data={chartData.expenses.byType} valueLabel="Amount" />
          </>
        )}
        {activeTab === "vouchers" && (
          <>
            <div className="sm:col-span-2">
              <SummaryCards
                totalAmount={chartData.vouchers.totalAmount}
                count={chartData.vouchers.count}
                amountLabel="Total voucher amount"
                variant="rose"
              />
            </div>
            <ChartSection title="By type (pie)" data={chartData.vouchers.byType} valueLabel="Count" />
            <BarSection title="By type (bar)" data={chartData.vouchers.byType} valueLabel="Count" />
            <ChartSection title="By type — amount (pie)" data={chartData.vouchers.byTypeAmount ?? []} valueLabel="Amount" />
            <BarSection title="By type — amount (bar)" data={chartData.vouchers.byTypeAmount ?? []} valueLabel="Amount" />
            <ChartSection title="By office (pie)" data={chartData.vouchers.byOffice ?? []} valueLabel="Count" />
            <BarSection title="By office (bar)" data={chartData.vouchers.byOffice ?? []} valueLabel="Count" />
            <ChartSection title="By status / claimed (pie)" data={chartData.vouchers.byStatus} valueLabel="Count" />
            <BarSection title="By status / claimed (bar)" data={chartData.vouchers.byStatus} valueLabel="Count" />
            <LineSection title="By month (line)" data={chartData.vouchers.byMonth ?? []} valueLabel="Count" />
            <AreaSection title="By month (area)" data={chartData.vouchers.byMonth ?? []} valueLabel="Count" />
          </>
        )}
        {activeTab === "trips" && (
          <>
            <ChartSection title="By status (pie)" data={chartData.trips.byStatus} valueLabel="Count" />
            <BarSection title="By status (bar)" data={chartData.trips.byStatus} valueLabel="Count" />
            <LineSection title="By month (line)" data={chartData.trips.byMonth} valueLabel="Count" />
            <AreaSection title="By month (area)" data={chartData.trips.byMonth} valueLabel="Count" />
          </>
        )}
        {activeTab === "prs" && (
          <>
            <ChartSection title="By status (pie)" data={chartData.purchase_requisitions.byStatus} valueLabel="Count" />
            <BarSection title="By status (bar)" data={chartData.purchase_requisitions.byStatus} valueLabel="Count" />
          </>
        )}
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={fetchChartData}
          className="text-xs text-slate-500 hover:text-slate-700 underline"
        >
          Refresh chart data
        </button>
      </div>
    </div>
  );
}
