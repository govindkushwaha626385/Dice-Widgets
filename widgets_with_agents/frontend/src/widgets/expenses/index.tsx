/**
 * Expenses widget: shows expenses scraped from the transaction UI.
 * No add-expense; widget shows up to 3 items; maximize shows all in a popup with View → details + timeline.
 */
import { useState, useEffect, useCallback } from "react";
import { WidgetWrapper } from "../../components/WidgetWrapper";
import { Modal } from "../../components/Modal";
import { apiFetch } from "../../lib/electronApi";
import type { ScrapedExpenseItem, ScrapedExpenseDetail } from "./types";

const EXPENSES_LIST_URL = "/api/widgets/expenses";
const WIDGET_PREVIEW_COUNT = 3;

interface ExpenseWidgetProps {
  maximized?: boolean;
  onMinimize?: () => void;
  onMaximize?: () => void;
}

function getExpensesUrl(): string {
  return EXPENSES_LIST_URL;
}

function getExpenseDetailUrl(id: string): string {
  return `${EXPENSES_LIST_URL}/${encodeURIComponent(id)}`;
}

export function ExpenseWidget({ maximized, onMinimize, onMaximize }: ExpenseWidgetProps) {
  const [items, setItems] = useState<ScrapedExpenseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ScrapedExpenseDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [hint, setHint] = useState<string | null>(null);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    setHint(null);
    try {
      const res = await apiFetch(getExpensesUrl());
      if (!res.ok) throw new Error("Failed to fetch expenses");
      const data = (await res.json()) as { items?: ScrapedExpenseItem[]; hint?: string } | ScrapedExpenseItem[];
      const list = Array.isArray(data) ? data : (data?.items ?? []);
      const hintMsg = !Array.isArray(data) && data?.hint ? data.hint : null;
      setItems(list);
      setHint(hintMsg ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load expenses");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const openDetail = useCallback(async (id: string) => {
    setDetailId(id);
    setDetail(null);
    setDetailLoading(true);
    try {
      const res = await apiFetch(getExpenseDetailUrl(id));
      if (!res.ok) throw new Error("Failed to fetch detail");
      const data = (await res.json()) as ScrapedExpenseDetail;
      setDetail(data);
    } catch {
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const closeDetail = useCallback(() => {
    setDetailId(null);
    setDetail(null);
  }, []);

  const preview = items.slice(0, WIDGET_PREVIEW_COUNT);

  if (maximized) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onMinimize}
            className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-800 hover:bg-amber-100"
          >
            ← Minimize
          </button>
          <button
            type="button"
            onClick={fetchList}
            className="rounded-lg bg-amber-500 text-white px-3 py-1.5 text-sm font-medium hover:bg-amber-600"
          >
            Refresh
          </button>
        </div>
        {loading ? (
          <p className="text-amber-700/70">Loading…</p>
        ) : error ? (
          <p className="text-red-600 text-sm">{error}</p>
        ) : items.length === 0 ? (
          <div className="text-amber-700/70 space-y-1">
            <p>No expenses.</p>
            {hint && <p className="text-muted mt-2">{hint}</p>}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-amber-200/80 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-amber-200/80 bg-amber-50/80 text-left text-amber-900 font-medium">
                  <th className="p-2">Details</th>
                  <th className="p-2">Service</th>
                  <th className="p-2 text-right">Amount</th>
                  <th className="p-2">Transaction Date</th>
                  <th className="p-2">Submission Date</th>
                  <th className="p-2">Created By</th>
                  <th className="p-2">Type</th>
                  <th className="p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((e) => (
                  <tr key={e.id} className="border-b border-amber-100/80 hover:bg-amber-50/60">
                    <td className="p-2 font-medium text-slate-800">{e.id}</td>
                    <td className="p-2">{e.service}</td>
                    <td className="p-2 text-right font-semibold tabular-nums">{e.amount}</td>
                    <td className="p-2">{e.transactionDate}</td>
                    <td className="p-2">{e.submissionDate}</td>
                    <td className="p-2">{e.createdBy}</td>
                    <td className="p-2">{e.type}</td>
                    <td className="p-2">
                      <button
                        type="button"
                        onClick={() => openDetail(e.id)}
                        className="rounded-md bg-amber-500 text-white px-2 py-1 text-xs font-medium hover:bg-amber-600"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Modal open={detailId != null} onClose={closeDetail} title={detail?.heading ?? "Expense details"}>
          {detailLoading ? (
            <p className="text-slate-500">Loading…</p>
          ) : detail ? (
            <div className="space-y-4 text-sm">
              <p className="font-semibold text-amber-700 text-base">{detail.amount}</p>
              <div className="border-t border-amber-200/60 pt-3">
                <h4 className="font-medium text-amber-800 mb-2">Details</h4>
                <dl className="space-y-1.5">
                  {Object.entries(detail.details).map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-4">
                      <dt className="text-slate-500 capitalize">{k}</dt>
                      <dd className="text-slate-800 font-medium">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
              <div className="border-t border-amber-200/60 pt-3">
                <h4 className="font-medium text-amber-800 mb-2">Timeline</h4>
                {detail.timeline.length > 0 ? (
                  <ul className="space-y-3">
                    {detail.timeline.map((t, i) => (
                      <li key={i} className="pl-3 border-l-2 border-amber-400">
                        <span className="font-medium text-slate-800 block">{t.title}</span>
                        {t.meta && <p className="text-slate-500 text-xs mt-0.5">{t.meta}</p>}
                        {t.time && <p className="text-slate-400 text-xs mt-0.5">{t.time}</p>}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-slate-400 text-sm">No timeline events.</p>
                )}
              </div>
              <button
                type="button"
                onClick={closeDetail}
                className="rounded-lg bg-amber-500 text-white px-4 py-2 font-medium hover:bg-amber-600"
              >
                Close
              </button>
            </div>
          ) : (
            <p className="text-slate-500">Could not load details.</p>
          )}
        </Modal>
      </div>
    );
  }

  return (
    <>
      <WidgetWrapper title="Expenses" variant="receipt" onMaximize={onMaximize} minHeight={false}>
        {loading ? (
          <p className="text-sm text-amber-700/80">Loading…</p>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : preview.length === 0 ? (
          <div className="text-sm text-amber-700/80 space-y-1">
            <p>No expenses.</p>
            {hint && <p className="text-xs text-slate-500 mt-2">{hint}</p>}
          </div>
        ) : (
          <ul className="space-y-1.5">
            {preview.map((e) => (
              <li
                key={e.id}
                className="flex justify-between items-center gap-2 py-2 px-2 rounded-lg bg-amber-50/80 border border-amber-200/50 hover:border-amber-300/60"
              >
                <div className="min-w-0 flex-1">
                  <span className="text-slate-800 font-medium truncate block text-[13px]">{e.service || e.id}</span>
                  <span className="text-amber-700/70 text-xs">{e.transactionDate}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-amber-800 font-semibold tabular-nums text-[13px]">{e.amount}</span>
                  <button
                    type="button"
                    onClick={() => openDetail(e.id)}
                    className="rounded-md bg-amber-500 text-white px-2 py-0.5 text-xs font-medium hover:bg-amber-600 shadow-sm"
                  >
                    View
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </WidgetWrapper>
      <Modal open={detailId != null} onClose={closeDetail} title={detail?.heading ?? "Expense details"}>
        {detailLoading ? (
          <p className="text-slate-500">Loading…</p>
        ) : detail ? (
          <div className="space-y-4 text-sm">
            <p className="font-semibold text-amber-700 text-base">{detail.amount}</p>
            <div className="border-t border-amber-200/60 pt-3">
              <h4 className="font-medium text-amber-800 mb-2">Details</h4>
              <dl className="space-y-1.5">
                {Object.entries(detail.details).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4">
                    <dt className="text-slate-500 capitalize">{k}</dt>
                    <dd className="text-slate-800 font-medium">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="border-t border-amber-200/60 pt-3">
              <h4 className="font-medium text-amber-800 mb-2">Timeline</h4>
              {detail.timeline.length > 0 ? (
                <ul className="space-y-3">
                  {detail.timeline.map((t, i) => (
                    <li key={i} className="pl-3 border-l-2 border-amber-400">
                      <span className="font-medium text-slate-800 block">{t.title}</span>
                      {t.meta && <p className="text-slate-500 text-xs mt-0.5">{t.meta}</p>}
                      {t.time && <p className="text-slate-400 text-xs mt-0.5">{t.time}</p>}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-slate-400 text-sm">No timeline events.</p>
              )}
            </div>
            <button
              type="button"
              onClick={closeDetail}
              className="rounded-lg bg-amber-500 text-white px-4 py-2 font-medium hover:bg-amber-600"
            >
              Close
            </button>
          </div>
        ) : (
          <p className="text-slate-500">Could not load details.</p>
        )}
      </Modal>
    </>
  );
}
