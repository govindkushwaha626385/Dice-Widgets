/**
 * Trips widget: list from scraper (corporate.dice.tech/app/travel/trips), all pages.
 * List shows trip ID and cities sequence; Details fetches full detail (overview, itinerary, transactions).
 * Delete action in list and in detail modal.
 */

import { useState, useEffect, useCallback } from "react";
import { WidgetWrapper } from "../../components/WidgetWrapper";
import { IconPlane } from "../../components/WidgetIcons";
import { Modal } from "../../components/Modal";
import { apiFetch, notify } from "../../lib/electronApi";
import type { ScrapedTripItem, ScrapedTripDetail } from "./types";

const API_BASE = "/api/widgets/trips";
const PREVIEW_COUNT = 3;

/** Exclude "View System logs" from display (don't show). */
function isViewSystemLogs(s: string | undefined | null): boolean {
  return typeof s === "string" && /view\s+system\s+logs/i.test(s.trim());
}

interface TripsWidgetProps {
  maximized?: boolean;
  onMinimize?: () => void;
  onMaximize?: () => void;
}

export function TripsWidget({ maximized, onMinimize, onMaximize }: TripsWidgetProps) {
  const [items, setItems] = useState<ScrapedTripItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [detailTrip, setDetailTrip] = useState<ScrapedTripItem | null>(null);
  const [detailData, setDetailData] = useState<ScrapedTripDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  /** Trip awaiting delete confirmation */
  const [deleteConfirmTrip, setDeleteConfirmTrip] = useState<ScrapedTripItem | null>(null);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    setHint(null);
    try {
      const res = await apiFetch(API_BASE);
      if (!res.ok) throw new Error("Failed to fetch trips");
      const data = (await res.json()) as { items?: ScrapedTripItem[]; hint?: string } | ScrapedTripItem[];
      const list = Array.isArray(data) ? data : data?.items ?? [];
      setItems(list);
      setHint(!Array.isArray(data) && data?.hint ? data.hint : null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load trips");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  useEffect(() => {
    if (!detailTrip) {
      setDetailData(null);
      return;
    }
    const id = detailTrip.tripId || detailTrip.id;
    if (!id) {
      setDetailData(null);
      return;
    }
    setDetailLoading(true);
    setDetailData(null);
    apiFetch(`${API_BASE}/${encodeURIComponent(id)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: ScrapedTripDetail | null) => setDetailData(data ?? null))
      .catch(() => setDetailData(null))
      .finally(() => setDetailLoading(false));
  }, [detailTrip]);

  const handleDelete = useCallback(
    async (t: ScrapedTripItem, fromModal?: boolean) => {
      const id = t.tripId || t.id;
      if (!id) return;
      setDeleteLoading(id);
      try {
        const res = await apiFetch(`${API_BASE}/${encodeURIComponent(id)}`, { method: "DELETE" });
        if (res.ok) {
          const data = (await res.json()) as { message?: string };
          notify("Trip deleted", data?.message ?? "Trip deleted successfully.");
          if (fromModal) setDetailTrip(null);
          await fetchList();
        }
      } finally {
        setDeleteLoading(null);
      }
    },
    [fetchList]
  );

  const onConfirmDelete = useCallback(async () => {
    if (!deleteConfirmTrip) return;
    const fromModal = detailTrip?.id === deleteConfirmTrip.id;
    await handleDelete(deleteConfirmTrip, fromModal);
    setDeleteConfirmTrip(null);
  }, [deleteConfirmTrip, detailTrip?.id, handleDelete]);

  const preview = items.slice(0, maximized ? undefined : PREVIEW_COUNT);
  const citiesDisplay = (t: ScrapedTripItem) => {
    const s = t.citiesSequence || t.location || "";
    return isViewSystemLogs(s) ? "—" : s || "—";
  };

  if (maximized) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onMinimize}
            className="rounded-lg border border-teal-300 bg-teal-50 px-4 py-2 text-teal-800 hover:bg-teal-100"
          >
            ← Minimize
          </button>
          <button
            type="button"
            onClick={fetchList}
            className="rounded-lg bg-teal-600 text-white px-4 py-2 font-medium hover:bg-teal-700"
          >
            Refresh
          </button>
        </div>
        {loading ? (
          <p className="text-teal-700/70">Loading…</p>
        ) : error ? (
          <p className="text-red-600 text-sm">{error}</p>
        ) : items.length === 0 ? (
          <div className="text-teal-700/70 space-y-1">
            <p>No trips.</p>
            {hint && <p className="text-muted mt-2">{hint}</p>}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-teal-200/80 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-teal-200/80 bg-teal-50/80 text-left text-teal-900 font-medium">
                  <th className="p-3">Trip ID</th>
                  <th className="p-3">Cities</th>
                  <th className="p-3">Title</th>
                  <th className="p-3">Dates</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((t) => (
                  <tr key={t.id} className="border-b border-teal-100/80 hover:bg-teal-50/60">
                    <td className="p-3 font-mono text-xs">{t.tripId || "—"}</td>
                    <td className="p-3">{citiesDisplay(t)}</td>
                    <td className="p-3 font-medium">{t.title || "—"}</td>
                    <td className="p-3">{t.dateDisplay || `${t.startDate} – ${t.endDate}` || "—"}</td>
                    <td className="p-3 flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setDetailTrip(t)}
                        className="rounded-md bg-teal-600 text-white px-2 py-1 text-xs font-medium hover:bg-teal-700"
                      >
                        Details
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmTrip(t)}
                        disabled={deleteLoading === (t.tripId || t.id)}
                        className="rounded-md border border-red-300 bg-red-50 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                      >
                        {deleteLoading === (t.tripId || t.id) ? "…" : "Delete"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Modal open={!!detailTrip} onClose={() => setDetailTrip(null)} title={detailTrip?.title ?? "Trip details"}>
          {detailTrip && (
            <div className="space-y-3 text-sm min-w-0 max-h-[80vh] overflow-y-auto">
              {detailLoading ? (
                <p className="text-slate-500">Loading detail…</p>
              ) : detailData ? (
                <>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    {[
                      ["Status", detailData.overview.status],
                      ["Employee", detailData.overview.employee],
                      ["Cash Advances", detailData.overview.cashAdvances],
                      ["Travel Advance", detailData.overview.travelAdvance],
                      ["Calculated Budget", detailData.overview.calculatedBudget],
                      ["Used Budget", detailData.overview.usedBudget],
                      ["Total Txns", detailData.overview.totalTxns],
                    ]
                      .filter(([, v]) => v != null && v !== "" && !isViewSystemLogs(String(v)))
                      .map(([label, value]) => (
                        <span key={label} className="contents">
                          <span className="text-slate-500">{label}</span>
                          <span>{value}</span>
                        </span>
                      ))}
                  </div>
                  {detailData.itinerary.filter((item) => !isViewSystemLogs(item.text)).length > 0 && (
                    <div>
                      <p className="font-medium text-slate-600 mb-1">Itinerary</p>
                      <ul className="list-disc list-inside space-y-0.5 text-xs max-h-24 overflow-y-auto">
                        {detailData.itinerary
                          .filter((item) => !isViewSystemLogs(item.text))
                          .map((item, i) => (
                            <li key={i}>{item.text}</li>
                          ))}
                      </ul>
                    </div>
                  )}
                  {detailData.transactions.length > 0 && (
                    <div>
                      <p className="font-medium text-slate-600 mb-1">Transactions</p>
                      <ul className="space-y-1 text-xs max-h-32 overflow-y-auto">
                        {detailData.transactions.map((tx, i) => (
                          <li key={i} className="border-l-2 border-teal-200 pl-2 py-0.5">
                            {tx.amount} · {tx.id}
                            {[tx.owner, tx.date, tx.service].filter(Boolean).length > 0 && (
                              <span className="text-slate-500"> · {[tx.owner, tx.date, tx.service].filter(Boolean).join(" · ")}</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="flex gap-2 pt-2 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmTrip(detailTrip)}
                      disabled={!!deleteLoading}
                      className="rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                    >
                      {deleteLoading ? "…" : "Delete"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDetailTrip(null)}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-50"
                    >
                      Close
                    </button>
                  </div>
                </>
              ) : (
                <p className="text-slate-500">Could not load detail.</p>
              )}
            </div>
          )}
        </Modal>
        <Modal open={!!deleteConfirmTrip} onClose={() => setDeleteConfirmTrip(null)} title="Delete trip?">
          {deleteConfirmTrip && (
            <div className="space-y-4 text-sm">
              <p className="text-slate-600">
                Are you sure you want to delete this trip? This action cannot be undone.
              </p>
              <p className="font-mono text-xs text-slate-500">
                {deleteConfirmTrip.tripId || deleteConfirmTrip.id} · {citiesDisplay(deleteConfirmTrip)}
              </p>
              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmTrip(null)}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onConfirmDelete}
                  disabled={deleteLoading === (deleteConfirmTrip.tripId || deleteConfirmTrip.id)}
                  className="rounded-lg bg-red-600 text-white px-3 py-1.5 font-medium hover:bg-red-700 disabled:opacity-50"
                >
                  {deleteLoading === (deleteConfirmTrip.tripId || deleteConfirmTrip.id) ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    );
  }

  return (
    <>
      <WidgetWrapper title="Trips" variant="journey" icon={<IconPlane />} onMaximize={onMaximize}>
        {loading ? (
          <p className="text-sm text-teal-700/70">Loading…</p>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : preview.length === 0 ? (
          <div className="text-sm text-teal-700/70 space-y-1">
            <p>No trips.</p>
            {hint && <p className="text-muted text-xs mt-2">{hint}</p>}
          </div>
        ) : (
          <ul className="space-y-1.5 max-h-[180px] overflow-auto">
            {preview.map((t) => (
              <li
                key={t.id}
                className="py-2 px-2.5 rounded-lg bg-teal-50/80 border border-teal-200/60 hover:border-teal-300/60 flex justify-between items-center gap-2"
              >
                <div className="min-w-0 flex-1">
                  <span className="font-mono text-xs text-slate-600 block">{t.tripId || "—"}</span>
                  <span className="text-slate-800 font-medium block truncate">{citiesDisplay(t)}</span>
                  <span className="text-muted text-xs">{t.dateDisplay || `${t.startDate} – ${t.endDate}`}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setDetailTrip(t)}
                    className="rounded-md bg-teal-600 text-white px-2 py-0.5 text-xs font-medium hover:bg-teal-700"
                  >
                    Details
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmTrip(t)}
                    disabled={deleteLoading === (t.tripId || t.id)}
                    className="rounded-md border border-red-200 bg-red-50/80 px-2 py-0.5 text-xs text-red-700 hover:bg-red-100 disabled:opacity-50"
                  >
                    {deleteLoading === (t.tripId || t.id) ? "…" : "Delete"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </WidgetWrapper>
      <Modal open={!!detailTrip} onClose={() => setDetailTrip(null)} title={detailTrip?.title ?? "Trip details"}>
        {detailTrip && (
          <div className="space-y-3 text-sm min-w-0 max-h-[80vh] overflow-y-auto">
            {detailLoading ? (
              <p className="text-slate-500">Loading detail…</p>
            ) : detailData ? (
              <>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  {[
                    ["Status", detailData.overview.status],
                    ["Employee", detailData.overview.employee],
                    ["Cash Advances", detailData.overview.cashAdvances],
                    ["Travel Advance", detailData.overview.travelAdvance],
                    ["Calculated Budget", detailData.overview.calculatedBudget],
                    ["Used Budget", detailData.overview.usedBudget],
                    ["Total Txns", detailData.overview.totalTxns],
                  ]
                    .filter(([, v]) => v != null && v !== "" && !isViewSystemLogs(String(v)))
                    .map(([label, value]) => (
                      <span key={label} className="contents">
                        <span className="text-slate-500">{label}</span>
                        <span>{value}</span>
                      </span>
                    ))}
                </div>
                {detailData.itinerary.filter((item) => !isViewSystemLogs(item.text)).length > 0 && (
                  <div>
                    <p className="font-medium text-slate-600 mb-1">Itinerary</p>
                    <ul className="list-disc list-inside space-y-0.5 text-xs max-h-24 overflow-y-auto">
                      {detailData.itinerary
                        .filter((item) => !isViewSystemLogs(item.text))
                        .map((item, i) => (
                          <li key={i}>{item.text}</li>
                        ))}
                    </ul>
                  </div>
                )}
                {detailData.transactions.length > 0 && (
                  <div>
                    <p className="font-medium text-slate-600 mb-1">Transactions</p>
                    <ul className="space-y-1 text-xs max-h-32 overflow-y-auto">
                      {detailData.transactions.map((tx, i) => (
                        <li key={i} className="border-l-2 border-teal-200 pl-2 py-0.5">
                          {tx.amount} · {tx.id}
                          {[tx.owner, tx.date, tx.service].filter(Boolean).length > 0 && (
                            <span className="text-slate-500"> · {[tx.owner, tx.date, tx.service].filter(Boolean).join(" · ")}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="flex gap-2 pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmTrip(detailTrip)}
                    disabled={!!deleteLoading}
                    className="rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                  >
                    {deleteLoading ? "…" : "Delete"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDetailTrip(null)}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-50"
                  >
                    Close
                  </button>
                </div>
              </>
            ) : (
              <p className="text-slate-500">Could not load detail.</p>
            )}
          </div>
        )}
      </Modal>
      <Modal open={!!deleteConfirmTrip} onClose={() => setDeleteConfirmTrip(null)} title="Delete trip?">
        {deleteConfirmTrip && (
          <div className="space-y-4 text-sm">
            <p className="text-slate-600">
              Are you sure you want to delete this trip? This action cannot be undone.
            </p>
            <p className="font-mono text-xs text-slate-500">
              {deleteConfirmTrip.tripId || deleteConfirmTrip.id} · {citiesDisplay(deleteConfirmTrip)}
            </p>
            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmTrip(null)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirmDelete}
                disabled={deleteLoading === (deleteConfirmTrip.tripId || deleteConfirmTrip.id)}
                className="rounded-lg bg-red-600 text-white px-3 py-1.5 font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {deleteLoading === (deleteConfirmTrip.tripId || deleteConfirmTrip.id) ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
