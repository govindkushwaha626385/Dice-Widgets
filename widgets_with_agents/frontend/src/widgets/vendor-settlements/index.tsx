/**
 * Vendor Settlements widget: list with View (Details), Mark Settled, Payout, Hold.
 * Mark Settled: Payment Mode + UTR/Cheque → POST log.ledger.
 * Payout: optional notes → POST payout.ledger.
 * Hold: remark → POST hold. Success messages via notify.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { WidgetWrapper } from "../../components/WidgetWrapper";
import { IconReceipt } from "../../components/WidgetIcons";
import { Modal } from "../../components/Modal";
import { apiFetch, notify } from "../../lib/electronApi";
import type { VendorSettlementItem } from "./types";

const API_BASE = "/api/widgets/vendor-settlements";
const PREVIEW_COUNT = 3;

const PAYMENT_MODE_OPTIONS = [
  "Cash",
  "Credit Note",
  "Cheque",
  "Bank",
  "Credit Card",
  "Net Banking",
] as const;

const getListUrl = () => API_BASE;
const getLogLedgerUrl = (ledgerId: string) =>
  `${API_BASE}/${encodeURIComponent(ledgerId)}/log.ledger`;
const getPayoutLedgerUrl = (ledgerId: string) =>
  `${API_BASE}/${encodeURIComponent(ledgerId)}/payout.ledger`;
const getHoldUrl = (ledgerId: string) =>
  `${API_BASE}/${encodeURIComponent(ledgerId)}/hold`;

interface VendorSettlementsWidgetProps {
  maximized?: boolean;
  onMinimize?: () => void;
  onMaximize?: () => void;
}

export function VendorSettlementsWidget({
  maximized,
  onMinimize,
  onMaximize,
}: VendorSettlementsWidgetProps) {
  const [items, setItems] = useState<VendorSettlementItem[]>([]);
  const [hint, setHint] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detailItem, setDetailItem] = useState<VendorSettlementItem | null>(null);
  const [markSettledItem, setMarkSettledItem] = useState<VendorSettlementItem | null>(null);
  const [payoutItem, setPayoutItem] = useState<VendorSettlementItem | null>(null);
  const [holdItem, setHoldItem] = useState<VendorSettlementItem | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [paymentMode, setPaymentMode] = useState("");
  const [utrOrChequeNumber, setUtrOrChequeNumber] = useState("");
  const [payoutNotes, setPayoutNotes] = useState("");
  const [holdRemark, setHoldRemark] = useState("");

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    setHint(null);
    try {
      const res = await apiFetch(getListUrl());
      if (!res.ok) throw new Error("Failed to fetch vendor settlements");
      const data = (await res.json()) as { items?: VendorSettlementItem[]; hint?: string } | VendorSettlementItem[];
      const list = Array.isArray(data) ? data : data?.items ?? [];
      const hintMsg = !Array.isArray(data) && (data as { hint?: string }).hint ? (data as { hint?: string }).hint : null;
      setItems(list);
      setHint(hintMsg ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load vendor settlements");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const preview = useMemo(
    () => (maximized ? items : items.slice(0, PREVIEW_COUNT)),
    [maximized, items]
  );

  const openMarkSettled = useCallback((item: VendorSettlementItem) => {
    setActionError(null);
    setMarkSettledItem(item);
    setPaymentMode("");
    setUtrOrChequeNumber("");
  }, []);

  const closeMarkSettled = useCallback(() => {
    setMarkSettledItem(null);
    setPaymentMode("");
    setUtrOrChequeNumber("");
  }, []);

  const openPayout = useCallback((item: VendorSettlementItem) => {
    setActionError(null);
    setPayoutItem(item);
    setPayoutNotes("");
  }, []);

  const closePayout = useCallback(() => {
    setPayoutItem(null);
    setPayoutNotes("");
  }, []);

  const openHold = useCallback((item: VendorSettlementItem) => {
    setActionError(null);
    setHoldItem(item);
    setHoldRemark("");
  }, []);

  const closeHold = useCallback(() => {
    setHoldItem(null);
    setHoldRemark("");
  }, []);

  const handleMarkSettledSubmit = useCallback(async () => {
    const item = markSettledItem;
    if (!item) return;
    setActionLoading(item.ledgerId);
    setActionError(null);
    try {
      const res = await apiFetch(getLogLedgerUrl(item.ledgerId), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentMode: paymentMode.trim() || undefined,
          utrOrChequeNumber: utrOrChequeNumber.trim() || undefined,
        }),
      });
      const data = (await res.json()) as { success?: boolean; message?: string; error?: string };
      if (res.ok && data.success !== false) {
        notify("Vendor Settlements", data?.message ?? "Marked as settled successfully.");
        closeMarkSettled();
        await fetchList();
      } else {
        setActionError(data?.error ?? data?.message ?? "Mark settled failed.");
      }
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Mark settled failed.");
    } finally {
      setActionLoading(null);
    }
  }, [markSettledItem, paymentMode, utrOrChequeNumber, closeMarkSettled, fetchList]);

  const handlePayoutSubmit = useCallback(async () => {
    const item = payoutItem;
    if (!item) return;
    setActionLoading(item.ledgerId);
    setActionError(null);
    try {
      const body = payoutNotes.trim() ? { notes: payoutNotes.trim() } : {};
      const res = await apiFetch(getPayoutLedgerUrl(item.ledgerId), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { success?: boolean; message?: string; error?: string };
      if (res.ok && data.success !== false) {
        notify("Vendor Settlements", data?.message ?? "Sent to payout successfully.");
        closePayout();
        await fetchList();
      } else {
        setActionError(data?.error ?? data?.message ?? "Payout failed.");
      }
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Payout failed.");
    } finally {
      setActionLoading(null);
    }
  }, [payoutItem, payoutNotes, closePayout, fetchList]);

  const handleHoldSubmit = useCallback(async () => {
    const item = holdItem;
    const remark = holdRemark.trim();
    if (!item || !remark) return;
    setActionLoading(item.ledgerId);
    setActionError(null);
    try {
      const res = await apiFetch(getHoldUrl(item.ledgerId), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ remark }),
      });
      const data = (await res.json()) as { success?: boolean; message?: string; error?: string };
      if (res.ok && data.success !== false) {
        notify("Vendor Settlements", data?.message ?? "Settlement put on hold successfully.");
        closeHold();
        await fetchList();
      } else {
        setActionError(data?.error ?? data?.message ?? "Hold failed.");
      }
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Hold failed.");
    } finally {
      setActionLoading(null);
    }
  }, [holdItem, holdRemark, closeHold, fetchList]);

  const actionButtons = (item: VendorSettlementItem) => (
    <div className="flex items-center gap-1 flex-wrap">
      <button type="button" onClick={() => setDetailItem(item)} className="rounded-md bg-sky-600 text-white px-2 py-0.5 text-xs font-medium hover:bg-sky-700">View</button>
      <button type="button" onClick={() => openMarkSettled(item)} disabled={!!actionLoading} className="rounded-md border border-green-600 bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 hover:bg-green-100 disabled:opacity-50">Mark Settled</button>
      <button type="button" onClick={() => openPayout(item)} disabled={!!actionLoading} className="rounded-md border border-slate-600 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50">Payout</button>
      <button type="button" onClick={() => openHold(item)} disabled={!!actionLoading} className="rounded-md border border-red-600 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50">Hold</button>
    </div>
  );

  const detailContent = (item: VendorSettlementItem) => (
    <div className="space-y-3 text-sm">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
        <dt className="text-slate-500">Vendor</dt>
        <dd className="font-medium">{item.vendorName}</dd>
        <dt className="text-slate-500">Ledger Id</dt>
        <dd className="font-mono text-xs">{item.ledgerId}</dd>
        <dt className="text-slate-500">Description</dt>
        <dd>{item.description || "—"}</dd>
        <dt className="text-slate-500">Type</dt>
        <dd>{item.type}</dd>
        <dt className="text-slate-500">Date</dt>
        <dd>{item.date}</dd>
        <dt className="text-slate-500">Amount</dt>
        <dd className="font-semibold">{item.amount}</dd>
      </dl>
      <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200">
        <button type="button" onClick={() => { setDetailItem(null); openMarkSettled(item); }} disabled={!!actionLoading} className="rounded-md border border-green-600 bg-green-50 px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-100">Mark Settled</button>
        <button type="button" onClick={() => { setDetailItem(null); openPayout(item); }} disabled={!!actionLoading} className="rounded-md border border-slate-600 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100">Payout</button>
        <button type="button" onClick={() => { setDetailItem(null); openHold(item); }} disabled={!!actionLoading} className="rounded-md border border-red-600 bg-red-50 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100">Hold</button>
      </div>
      <button type="button" onClick={() => setDetailItem(null)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-50">Close</button>
    </div>
  );

  if (maximized) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <button type="button" onClick={onMinimize} className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-sm font-medium text-rose-800 hover:bg-rose-100">← Minimize</button>
          <button type="button" onClick={fetchList} className="rounded-lg bg-rose-500 text-white px-3 py-1.5 text-sm font-medium hover:bg-rose-600">Refresh</button>
        </div>
        {actionError && <p className="text-red-600 text-sm">{actionError}</p>}
        {loading ? (
          <p className="text-rose-700/70">Loading…</p>
        ) : error ? (
          <p className="text-red-600 text-sm">{error}</p>
        ) : items.length === 0 ? (
          <div className="text-rose-700/70 space-y-1">
            <p>No vendor settlements.</p>
            {hint && <p className="text-xs text-slate-500 mt-2">{hint}</p>}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-rose-200/80 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-rose-200/80 bg-rose-50/80 text-left text-rose-900 font-medium">
                  <th className="p-2">Details</th>
                  <th className="p-2">Ledger Id</th>
                  <th className="p-2">Type</th>
                  <th className="p-2">Date</th>
                  <th className="p-2 text-right">Amount</th>
                  <th className="p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((s) => (
                  <tr key={s.ledgerId} className="border-b border-rose-100/80 hover:bg-rose-50/60">
                    <td className="p-2">
                      <span className="font-medium text-slate-800 block">{s.vendorName}</span>
                      {s.description && <span className="text-xs text-slate-500">{s.description}</span>}
                    </td>
                    <td className="p-2 font-mono text-xs">{s.ledgerId}</td>
                    <td className="p-2">{s.type}</td>
                    <td className="p-2">{s.date}</td>
                    <td className="p-2 text-right font-medium">{s.amount}</td>
                    <td className="p-2">{actionButtons(s)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Modal open={!!detailItem} onClose={() => setDetailItem(null)} title="Vendor settlement details">
          {detailItem && detailContent(detailItem)}
        </Modal>

        <Modal open={!!markSettledItem} onClose={closeMarkSettled} title="Mark Settled">
          {markSettledItem && (
            <div className="space-y-4">
              <p className="text-slate-600 text-sm">Enter payment details to mark this settlement as settled.</p>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Payment Mode</label>
                <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white">
                  <option value="">Select payment mode</option>
                  {PAYMENT_MODE_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">UTR / Cheque Number</label>
                <input type="text" value={utrOrChequeNumber} onChange={(e) => setUtrOrChequeNumber(e.target.value)} placeholder="UTR or Cheque Number" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </div>
              {actionError && <p className="text-red-600 text-xs">{actionError}</p>}
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={closeMarkSettled} className="rounded-lg border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-50">Cancel</button>
                <button type="button" onClick={handleMarkSettledSubmit} disabled={!!actionLoading} className="rounded-lg bg-green-600 text-white px-3 py-1.5 font-medium hover:bg-green-700 disabled:opacity-50">{actionLoading === markSettledItem.ledgerId ? "…" : "Mark Settled"}</button>
              </div>
            </div>
          )}
        </Modal>

        <Modal open={!!payoutItem} onClose={closePayout} title="Send to Payout">
          {payoutItem && (
            <div className="space-y-4">
              <p className="text-slate-600 text-sm">Add notes for this payout (optional).</p>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes (optional)</label>
                <textarea value={payoutNotes} onChange={(e) => setPayoutNotes(e.target.value)} placeholder="Notes or reference" rows={3} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </div>
              {actionError && <p className="text-red-600 text-xs">{actionError}</p>}
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={closePayout} className="rounded-lg border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-50">Cancel</button>
                <button type="button" onClick={handlePayoutSubmit} disabled={!!actionLoading} className="rounded-lg bg-rose-600 text-white px-3 py-1.5 font-medium hover:bg-rose-700 disabled:opacity-50">{actionLoading === payoutItem.ledgerId ? "…" : "Send to Payout"}</button>
              </div>
            </div>
          )}
        </Modal>

        <Modal open={!!holdItem} onClose={closeHold} title="Confirm Hold">
          {holdItem && (
            <div className="space-y-4">
              <p className="text-slate-600 text-sm">Put this settlement on hold? Enter a remark (required) and confirm.</p>
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-2 text-sm">
                <span className="font-mono text-xs text-slate-600">{holdItem.ledgerId}</span>
                <span className="block font-medium text-slate-800">{holdItem.vendorName}</span>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Remark (required)</label>
                <textarea value={holdRemark} onChange={(e) => setHoldRemark(e.target.value)} placeholder="Enter reason for hold…" rows={3} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </div>
              {actionError && <p className="text-red-600 text-xs">{actionError}</p>}
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={closeHold} className="rounded-lg border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-50">Cancel</button>
                <button type="button" onClick={handleHoldSubmit} disabled={!!actionLoading || !holdRemark.trim()} className="rounded-lg bg-red-600 text-white px-3 py-1.5 font-medium hover:bg-red-700 disabled:opacity-50">{actionLoading === holdItem.ledgerId ? "…" : "Confirm Hold"}</button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    );
  }

  return (
    <>
      <WidgetWrapper title="Vendor Settlements" variant="ticket" icon={<IconReceipt />} onMaximize={onMaximize}>
        {actionError && <p className="text-red-600 text-xs mb-1">{actionError}</p>}
        {loading ? (
          <p className="text-sm text-rose-700/70">Loading…</p>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : preview.length === 0 ? (
          <div className="text-sm text-rose-700/70 space-y-1">
            <p>No vendor settlements.</p>
            {hint && <p className="text-xs text-slate-500 mt-2">{hint}</p>}
          </div>
        ) : (
          <ul className="space-y-1.5 max-h-[180px] overflow-auto">
            {preview.map((s) => (
              <li key={s.ledgerId} className="py-2 px-2.5 rounded-lg bg-rose-50/80 border border-rose-200/60 flex justify-between items-center gap-2">
                <div className="min-w-0 flex-1">
                  <span className="font-mono text-xs text-slate-600 block">{s.ledgerId}</span>
                  <span className="text-slate-800 font-medium block truncate">{s.vendorName}</span>
                  <span className="text-muted text-xs">{s.amount}</span>
                </div>
                <div className="shrink-0">{actionButtons(s)}</div>
              </li>
            ))}
          </ul>
        )}
      </WidgetWrapper>

      <Modal open={!!detailItem} onClose={() => setDetailItem(null)} title="Vendor settlement details">
        {detailItem && detailContent(detailItem)}
      </Modal>

      <Modal open={!!markSettledItem} onClose={closeMarkSettled} title="Mark Settled">
        {markSettledItem && (
          <div className="space-y-4">
            <p className="text-slate-600 text-sm">Enter payment details to mark this settlement as settled.</p>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Payment Mode</label>
              <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white">
                <option value="">Select payment mode</option>
                {PAYMENT_MODE_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">UTR / Cheque Number</label>
              <input type="text" value={utrOrChequeNumber} onChange={(e) => setUtrOrChequeNumber(e.target.value)} placeholder="UTR or Cheque Number" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
            {actionError && <p className="text-red-600 text-xs">{actionError}</p>}
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={closeMarkSettled} className="rounded-lg border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-50">Cancel</button>
              <button type="button" onClick={handleMarkSettledSubmit} disabled={!!actionLoading} className="rounded-lg bg-green-600 text-white px-3 py-1.5 font-medium hover:bg-green-700 disabled:opacity-50">{actionLoading === markSettledItem.ledgerId ? "…" : "Mark Settled"}</button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!payoutItem} onClose={closePayout} title="Send to Payout">
        {payoutItem && (
          <div className="space-y-4">
            <p className="text-slate-600 text-sm">Add notes for this payout (optional).</p>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Notes (optional)</label>
              <textarea value={payoutNotes} onChange={(e) => setPayoutNotes(e.target.value)} placeholder="Notes or reference" rows={3} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
            {actionError && <p className="text-red-600 text-xs">{actionError}</p>}
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={closePayout} className="rounded-lg border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-50">Cancel</button>
              <button type="button" onClick={handlePayoutSubmit} disabled={!!actionLoading} className="rounded-lg bg-rose-600 text-white px-3 py-1.5 font-medium hover:bg-rose-700 disabled:opacity-50">{actionLoading === payoutItem.ledgerId ? "…" : "Send to Payout"}</button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!holdItem} onClose={closeHold} title="Confirm Hold">
        {holdItem && (
          <div className="space-y-4">
            <p className="text-slate-600 text-sm">Put this settlement on hold? Enter a remark (required) and confirm.</p>
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-2 text-sm">
              <span className="font-mono text-xs text-slate-600">{holdItem.ledgerId}</span>
              <span className="block font-medium text-slate-800">{holdItem.vendorName}</span>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Remark (required)</label>
              <textarea value={holdRemark} onChange={(e) => setHoldRemark(e.target.value)} placeholder="Enter reason for hold…" rows={3} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
            {actionError && <p className="text-red-600 text-xs">{actionError}</p>}
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={closeHold} className="rounded-lg border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-50">Cancel</button>
              <button type="button" onClick={handleHoldSubmit} disabled={!!actionLoading || !holdRemark.trim()} className="rounded-lg bg-red-600 text-white px-3 py-1.5 font-medium hover:bg-red-700 disabled:opacity-50">{actionLoading === holdItem.ledgerId ? "…" : "Confirm Hold"}</button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
