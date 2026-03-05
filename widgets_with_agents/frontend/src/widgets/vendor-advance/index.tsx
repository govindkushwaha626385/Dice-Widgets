/**
 * Vendor Advance widget: list from scraper; View detail, Approve, Decline.
 * Approve/Decline call Heimdall API (require user confirmation). Decline requires remarks.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { WidgetWrapper } from "../../components/WidgetWrapper";
import { IconFilePlus } from "../../components/WidgetIcons";
import { Modal } from "../../components/Modal";
import { apiFetch, notify } from "../../lib/electronApi";
import type {
  ScrapedVendorAdvanceItem,
  ScrapedVendorAdvanceDetail,
} from "./types";

const API_BASE = "/api/widgets/vendor-advances";
const PREVIEW_COUNT = 3;

const getListUrl = () => API_BASE;
const getDetailUrl = (id: string) => `${API_BASE}/${encodeURIComponent(id)}`;
const getApproveUrl = (numericId: number) => `${API_BASE}/${numericId}/approve`;
const getDeclineUrl = (numericId: number) => `${API_BASE}/${numericId}/decline`;

/** Fallback: parse trailing number from id e.g. VC_ADVANCE-INTERN-00019 -> 19. Heimdall may accept this. */
function parseNumericIdFromString(id: string): number | null {
  if (!id || typeof id !== "string") return null;
  const m = id.match(/(\d+)(?:\D*)$/) || id.match(/(\d+)/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return Number.isInteger(n) && n > 0 ? n : null;
}

interface VendorAdvanceWidgetProps {
  maximized?: boolean;
  onMinimize?: () => void;
  onMaximize?: () => void;
}

export function VendorAdvanceWidget({
  maximized,
  onMinimize,
  onMaximize,
}: VendorAdvanceWidgetProps) {
  const [items, setItems] = useState<ScrapedVendorAdvanceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ScrapedVendorAdvanceDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [approveConfirmId, setApproveConfirmId] = useState<string | null>(null);
  const [declineModalItem, setDeclineModalItem] = useState<ScrapedVendorAdvanceItem | null>(null);
  const [declineRemark, setDeclineRemark] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState(false);
  const [resolvedNumericId, setResolvedNumericId] = useState<number | null>(null);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    setHint(null);
    try {
      const res = await apiFetch(getListUrl());
      if (!res.ok) throw new Error("Failed to fetch vendor advances");
      const data = (await res.json()) as
        | { items?: ScrapedVendorAdvanceItem[]; hint?: string }
        | ScrapedVendorAdvanceItem[];
      const list = Array.isArray(data) ? data : data?.items ?? [];
      setItems(list);
      setHint(!Array.isArray(data) && data?.hint ? data.hint : null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load vendor advances");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const openDetail = useCallback(async (id: string) => {
    setActionError(null);
    setDetailId(id);
    setDetail(null);
    setDetailLoading(true);
    try {
      const res = await apiFetch(getDetailUrl(id));
      if (!res.ok) throw new Error("Failed to fetch detail");
      const data = (await res.json()) as ScrapedVendorAdvanceDetail;
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

  /** Resolve numericId: from item, from open detail, or fetch detail */
  const resolveNumericId = useCallback(
    async (item: ScrapedVendorAdvanceItem): Promise<number | null> => {
      if (item.numericId != null) return item.numericId;
      if (detailId === item.id && detail?.numericId != null) return detail.numericId;
      try {
        const res = await apiFetch(getDetailUrl(item.id));
        if (!res.ok) return null;
        const d = (await res.json()) as ScrapedVendorAdvanceDetail;
        return d.numericId ?? null;
      } catch {
        return null;
      }
    },
    [detailId, detail?.numericId]
  );

  const handleApproveClick = useCallback((item: ScrapedVendorAdvanceItem) => {
    setActionError(null);
    setResolvedNumericId(null);
    setApproveConfirmId(item.id);
  }, []);

  useEffect(() => {
    if (!approveConfirmId) {
      setResolvedNumericId(null);
      setResolvingId(false);
      return;
    }
    const item = items.find((i) => i.id === approveConfirmId);
    if (!item || item.numericId != null) {
      if (item?.numericId != null) setResolvedNumericId(item.numericId);
      setResolvingId(false);
      return;
    }
    setResolvedNumericId(null);
    setResolvingId(true);
    let cancelled = false;
    resolveNumericId(item).then((n) => {
      if (!cancelled) {
        setResolvedNumericId(n);
        setResolvingId(false);
        if (n != null) setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, numericId: n } : i)));
      }
    });
    return () => { cancelled = true; };
  }, [approveConfirmId, items, resolveNumericId]);

  useEffect(() => {
    if (!declineModalItem) {
      setResolvedNumericId(null);
      setResolvingId(false);
      return;
    }
    const item = declineModalItem;
    if (item.numericId != null) {
      setResolvedNumericId(item.numericId);
      setResolvingId(false);
      return;
    }
    setResolvedNumericId(null);
    setResolvingId(true);
    let cancelled = false;
    resolveNumericId(item).then((n) => {
      if (!cancelled) {
        setResolvedNumericId(n);
        setResolvingId(false);
        if (n != null) setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, numericId: n } : i)));
      }
    });
    return () => { cancelled = true; };
  }, [declineModalItem, resolveNumericId]);

  const handleApproveConfirm = useCallback(async () => {
    const id = approveConfirmId;
    if (!id) return;
    const item = items.find((i) => i.id === id);
    if (!item) {
      setApproveConfirmId(null);
      return;
    }
    setActionLoading(id);
    setActionError(null);
    try {
      let numericId = resolvedNumericId ?? item.numericId ?? (await resolveNumericId(item));
      if (numericId == null) {
        numericId = parseNumericIdFromString(item.id);
      }
      if (numericId == null) {
        setActionError("Could not get advance ID. Open View first, then Approve from the detail panel.");
        setApproveConfirmId(null);
        return;
      }
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, numericId } : i)));
      const res = await apiFetch(getApproveUrl(numericId), { method: "POST" });
      const data = (await res.json()) as { success?: boolean; message?: string };
      if (res.ok && data.success !== false) {
        notify("Vendor Advance", data?.message ?? "Approved successfully.");
        setApproveConfirmId(null);
        await fetchList();
        if (detailId === id) closeDetail();
      } else {
        setActionError(data?.message ?? "Approve failed.");
      }
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Approve failed.");
    } finally {
      setActionLoading(null);
    }
  }, [approveConfirmId, items, resolveNumericId, resolvedNumericId, detailId, fetchList, closeDetail]);

  const openDeclineModal = useCallback((item: ScrapedVendorAdvanceItem) => {
    setActionError(null);
    setDeclineModalItem(item);
    setDeclineRemark("");
  }, []);

  const closeDeclineModal = useCallback(() => {
    setDeclineModalItem(null);
    setDeclineRemark("");
  }, []);

  const handleDeclineSubmit = useCallback(async () => {
    const item = declineModalItem;
    if (!item) return;
    setActionLoading(item.id);
    setActionError(null);
    try {
      let numericId = resolvedNumericId ?? item.numericId ?? (await resolveNumericId(item));
      if (numericId == null) {
        numericId = parseNumericIdFromString(item.id);
      }
      if (numericId == null) {
        setActionError("Could not get advance ID. Open View first, then Decline from the detail panel.");
        return;
      }
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, numericId } : i)));
      const res = await apiFetch(getDeclineUrl(numericId), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ remarks: declineRemark }),
      });
      const data = (await res.json()) as { success?: boolean; message?: string };
      if (res.ok && data.success !== false) {
        notify("Vendor Advance", data?.message ?? "Declined successfully.");
        closeDeclineModal();
        await fetchList();
        if (detailId === item.id) closeDetail();
      } else {
        setActionError(data?.message ?? "Decline failed.");
      }
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Decline failed.");
    } finally {
      setActionLoading(null);
    }
  }, [declineModalItem, declineRemark, resolveNumericId, resolvedNumericId, detailId, fetchList, closeDetail, closeDeclineModal]);

  const preview = useMemo(
    () => (maximized ? items : items.slice(0, PREVIEW_COUNT)),
    [maximized, items]
  );

  const actionButtons = (item: ScrapedVendorAdvanceItem) => (
    <div className="flex items-center gap-1 flex-wrap">
      <button
        type="button"
        onClick={() => openDetail(item.id)}
        className="rounded-md bg-sky-600 text-white px-2 py-0.5 text-xs font-medium hover:bg-sky-700"
      >
        View
      </button>
      <button
        type="button"
        onClick={() => handleApproveClick(item)}
        disabled={!!actionLoading}
        className="rounded-md border border-green-600 bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 hover:bg-green-100 disabled:opacity-50"
      >
        Approve
      </button>
      <button
        type="button"
        onClick={() => openDeclineModal(item)}
        disabled={!!actionLoading}
        className="rounded-md border border-red-600 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
      >
        Decline
      </button>
    </div>
  );

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
        {actionError && (
          <p className="text-red-600 text-sm">{actionError}</p>
        )}
        {loading ? (
          <p className="text-amber-700/70">Loading…</p>
        ) : error ? (
          <p className="text-red-600 text-sm">{error}</p>
        ) : items.length === 0 ? (
          <div className="text-amber-700/70 space-y-1">
            <p>No vendor advances.</p>
            {hint && <p className="text-muted mt-2">{hint}</p>}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-amber-200/80 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-amber-200/80 bg-amber-50/80 text-left text-amber-900 font-medium">
                  <th className="p-2">ID</th>
                  <th className="p-2">Vendor Name</th>
                  <th className="p-2 text-right">Amount</th>
                  <th className="p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((v) => (
                  <tr key={v.id} className="border-b border-amber-100/80 hover:bg-amber-50/60">
                    <td className="p-2 font-mono text-xs">{v.id}</td>
                    <td className="p-2">{v.vendorName || "—"}</td>
                    <td className="p-2 text-right">{v.amount || "—"}</td>
                    <td className="p-2">{actionButtons(v)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Approve confirmation */}
        <Modal open={!!approveConfirmId} onClose={() => setApproveConfirmId(null)} title="Approve vendor advance?">
          {approveConfirmId && (
            <div className="space-y-3 text-sm">
              <p className="text-slate-600">Are you sure you want to approve this vendor advance?</p>
              {!resolvingId && resolvedNumericId == null && items.find((i) => i.id === approveConfirmId)?.numericId == null && (
                <p className="text-amber-600 text-xs">Open View first, then use Approve from the detail panel if this fails.</p>
              )}
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setApproveConfirmId(null)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-50">Cancel</button>
                <button type="button" onClick={handleApproveConfirm} disabled={!!actionLoading} className="rounded-lg bg-green-600 text-white px-3 py-1.5 font-medium hover:bg-green-700 disabled:opacity-50">{actionLoading ? "…" : "Approve"}</button>
              </div>
            </div>
          )}
        </Modal>

        {/* Detail modal */}
        <Modal open={!!detailId} onClose={closeDetail} title={detailId ?? "Vendor Advance"}>
          {detailId && (
            <div className="space-y-3 text-sm min-w-0 max-h-[80vh] overflow-y-auto">
              {detailLoading ? (
                <p className="text-slate-500">Loading…</p>
              ) : detail ? (
                <>
                  <div>
                    <p className="font-medium text-slate-600 mb-1">Advance Details</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                      {Object.entries(detail.advanceDetails)
                        .filter(([, v]) => v != null && v !== "")
                        .map(([k, v]) => (
                          <span key={k} className="contents">
                            <span className="text-slate-500">{k.replace(/([A-Z])/g, " $1").trim()}</span>
                            <span>{v}</span>
                          </span>
                        ))}
                    </div>
                  </div>
                  {detail.timeline.length > 0 && (
                    <div>
                      <p className="font-medium text-slate-600 mb-1">Timeline</p>
                      <ul className="space-y-2 text-xs">
                        {detail.timeline.map((ev, i) => (
                          <li key={i} className="border-l-2 border-amber-200 pl-2 py-0.5">
                            <span className="font-medium">{ev.title}</span>
                            {ev.submittedBy && (
                              <p className="text-slate-600">Submitted by {ev.submittedBy}</p>
                            )}
                            {ev.sentOn && <p className="text-slate-500">Sent on: {ev.sentOn}</p>}
                            {ev.approvedOn && <p className="text-slate-500">Approved on: {ev.approvedOn}</p>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="flex gap-2 pt-2 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => detail && handleApproveClick({ id: detail.id, vendorName: "", tdsCode: "", poNumber: "", amount: "", numericId: detail.numericId } as ScrapedVendorAdvanceItem)}
                      disabled={!!actionLoading}
                      className="rounded-lg border border-green-600 bg-green-50 px-3 py-1.5 text-sm font-medium text-green-700 hover:bg-green-100 disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => detail && openDeclineModal({ id: detail.id, vendorName: "", tdsCode: "", poNumber: "", amount: "", numericId: detail.numericId } as ScrapedVendorAdvanceItem)}
                      disabled={!!actionLoading}
                      className="rounded-lg border border-red-600 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                    >
                      Decline
                    </button>
                    <button
                      type="button"
                      onClick={closeDetail}
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

        {/* Decline modal (remarks + confirm) */}
        <Modal open={!!declineModalItem} onClose={closeDeclineModal} title="Decline vendor advance">
          {declineModalItem && (
            <div className="space-y-3 text-sm">
              <p className="text-slate-600">Are you sure you want to decline? Enter remarks (required):</p>
              {!resolvingId && resolvedNumericId == null && declineModalItem.numericId == null && (
                <p className="text-amber-600 text-xs">Open View first, then use Decline from the detail panel if this fails.</p>
              )}
              <textarea
                value={declineRemark}
                onChange={(e) => setDeclineRemark(e.target.value)}
                placeholder="Enter remarks…"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm min-h-[80px]"
                rows={3}
              />
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={closeDeclineModal} className="rounded-lg border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-50">Cancel</button>
                <button type="button" onClick={handleDeclineSubmit} disabled={!!actionLoading} className="rounded-lg bg-red-600 text-white px-3 py-1.5 font-medium hover:bg-red-700 disabled:opacity-50">{actionLoading ? "…" : "Decline"}</button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    );
  }

  return (
    <>
      <WidgetWrapper title="Vendor Advance" variant="receipt" icon={<IconFilePlus />} onMaximize={onMaximize}>
        {actionError && <p className="text-red-600 text-xs mb-1">{actionError}</p>}
        {loading ? (
          <p className="text-sm text-amber-700/70">Loading…</p>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : preview.length === 0 ? (
          <div className="text-sm text-amber-700/70 space-y-1">
            <p>No vendor advances.</p>
            {hint && <p className="text-muted text-xs mt-2">{hint}</p>}
          </div>
        ) : (
          <ul className="space-y-1.5 max-h-[180px] overflow-auto">
            {preview.map((v) => (
              <li
                key={v.id}
                className="py-2 px-2.5 rounded-lg bg-amber-50/80 border border-amber-200/60 flex justify-between items-center gap-2"
              >
                <div className="min-w-0 flex-1">
                  <span className="font-mono text-xs text-slate-600 block">{v.id}</span>
                  <span className="text-slate-800 font-medium block truncate">{v.vendorName || "—"}</span>
                  <span className="text-muted text-xs">{v.amount || "—"}</span>
                </div>
                <div className="shrink-0">{actionButtons(v)}</div>
              </li>
            ))}
          </ul>
        )}
      </WidgetWrapper>

      {/* Approve confirmation */}
      <Modal open={!!approveConfirmId} onClose={() => setApproveConfirmId(null)} title="Approve vendor advance?">
        {approveConfirmId && (
          <div className="space-y-3 text-sm">
            <p className="text-slate-600">Are you sure you want to approve this vendor advance?</p>
            {resolvingId && <p className="text-amber-600 text-xs">Getting advance ID…</p>}
            {!resolvingId && resolvedNumericId == null && items.find((i) => i.id === approveConfirmId)?.numericId == null && (
              <p className="text-amber-600 text-xs">Open View first, then use Approve from the detail panel if this fails.</p>
            )}
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setApproveConfirmId(null)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-50">Cancel</button>
              <button type="button" onClick={handleApproveConfirm} disabled={!!actionLoading} className="rounded-lg bg-green-600 text-white px-3 py-1.5 font-medium hover:bg-green-700 disabled:opacity-50">{actionLoading ? "…" : "Approve"}</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Detail modal */}
      <Modal open={!!detailId} onClose={closeDetail} title={detailId ?? "Vendor Advance"}>
        {detailId && (
          <div className="space-y-3 text-sm min-w-0 max-h-[80vh] overflow-y-auto">
            {detailLoading ? (
              <p className="text-slate-500">Loading…</p>
            ) : detail ? (
              <>
                <div>
                  <p className="font-medium text-slate-600 mb-1">Advance Details</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    {Object.entries(detail.advanceDetails)
                      .filter(([, v]) => v != null && v !== "")
                      .map(([k, v]) => (
                        <span key={k} className="contents">
                          <span className="text-slate-500">{k.replace(/([A-Z])/g, " $1").trim()}</span>
                          <span>{v}</span>
                        </span>
                      ))}
                  </div>
                </div>
                {detail.timeline.length > 0 && (
                  <div>
                    <p className="font-medium text-slate-600 mb-1">Timeline</p>
                    <ul className="space-y-2 text-xs">
                      {detail.timeline.map((ev, i) => (
                        <li key={i} className="border-l-2 border-amber-200 pl-2 py-0.5">
                          <span className="font-medium">{ev.title}</span>
                          {ev.submittedBy && <p className="text-slate-600">Submitted by {ev.submittedBy}</p>}
                          {ev.sentOn && <p className="text-slate-500">Sent on: {ev.sentOn}</p>}
                          {ev.approvedOn && <p className="text-slate-500">Approved on: {ev.approvedOn}</p>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="flex gap-2 pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => detail && handleApproveClick({ id: detail.id, vendorName: "", tdsCode: "", poNumber: "", amount: "", numericId: detail.numericId } as ScrapedVendorAdvanceItem)}
                    disabled={!!actionLoading}
                    className="rounded-lg border border-green-600 bg-green-50 px-3 py-1.5 text-sm font-medium text-green-700 hover:bg-green-100 disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => detail && openDeclineModal({ id: detail.id, vendorName: "", tdsCode: "", poNumber: "", amount: "", numericId: detail.numericId } as ScrapedVendorAdvanceItem)}
                    disabled={!!actionLoading}
                    className="rounded-lg border border-red-600 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                  >
                    Decline
                  </button>
                  <button type="button" onClick={closeDetail} className="rounded-lg border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-50">
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

      {/* Decline modal */}
      <Modal open={!!declineModalItem} onClose={closeDeclineModal} title="Decline vendor advance">
        {declineModalItem && (
          <div className="space-y-3 text-sm">
            <p className="text-slate-600">Remarks (required for decline):</p>
            {!resolvingId && resolvedNumericId == null && declineModalItem.numericId == null && (
              <p className="text-amber-600 text-xs">Open View first, then use Decline from the detail panel if this fails.</p>
            )}
            <textarea
              value={declineRemark}
              onChange={(e) => setDeclineRemark(e.target.value)}
              placeholder="Enter remarks…"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm min-h-[80px]"
              rows={3}
            />
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={closeDeclineModal} className="rounded-lg border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-50">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeclineSubmit}
                disabled={!!actionLoading}
                className="rounded-lg bg-red-600 text-white px-3 py-1.5 font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {actionLoading ? "…" : "Decline"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
