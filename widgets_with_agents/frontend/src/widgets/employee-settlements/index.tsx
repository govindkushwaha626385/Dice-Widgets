/**
 * Employee Settlements widget: list with Details, Mark Settled, Payout.
 * Mark Settled: user input (payment mode, UTR/cheque) → POST log.ledger.
 * Payout: user input → POST payout.ledger. Success messages via notify.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { WidgetWrapper } from "../../components/WidgetWrapper";
import { IconBriefcase } from "../../components/WidgetIcons";
import { Modal } from "../../components/Modal";
import { apiFetch, notify } from "../../lib/electronApi";
import type { SettlementItem } from "./types";

const API_BASE = "/api/widgets/employee-settlements";
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

interface EmployeeSettlementsWidgetProps {
  maximized?: boolean;
  onMinimize?: () => void;
  onMaximize?: () => void;
}

export function EmployeeSettlementsWidget({
  maximized,
  onMinimize,
  onMaximize,
}: EmployeeSettlementsWidgetProps) {
  const [items, setItems] = useState<SettlementItem[]>([]);
  const [hint, setHint] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detailItem, setDetailItem] = useState<SettlementItem | null>(null);
  const [markSettledItem, setMarkSettledItem] = useState<SettlementItem | null>(null);
  const [payoutItem, setPayoutItem] = useState<SettlementItem | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Mark Settled form
  const [paymentMode, setPaymentMode] = useState("");
  const [utrOrChequeNumber, setUtrOrChequeNumber] = useState("");

  // Payout form (optional user input)
  const [payoutNotes, setPayoutNotes] = useState("");

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    setHint(null);
    try {
      const res = await apiFetch(getListUrl());
      if (!res.ok) throw new Error("Failed to fetch settlements");
      const data = (await res.json()) as { items?: SettlementItem[]; hint?: string } | SettlementItem[];
      const list = Array.isArray(data) ? data : data?.items ?? [];
      const hintMsg = !Array.isArray(data) && (data as { hint?: string }).hint ? (data as { hint?: string }).hint : null;
      setItems(list);
      setHint(hintMsg ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load employee settlements");
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

  const openMarkSettled = useCallback((item: SettlementItem) => {
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

  const openPayout = useCallback((item: SettlementItem) => {
    setActionError(null);
    setPayoutItem(item);
    setPayoutNotes("");
  }, []);

  const closePayout = useCallback(() => {
    setPayoutItem(null);
    setPayoutNotes("");
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
      const data = (await res.json()) as { success?: boolean; message?: string };
      if (res.ok && data.success !== false) {
        notify("Employee Settlements", data?.message ?? "Marked as settled successfully.");
        closeMarkSettled();
        await fetchList();
      } else {
        setActionError(data?.message ?? "Mark settled failed.");
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
      const data = (await res.json()) as { success?: boolean; message?: string };
      if (res.ok && data.success !== false) {
        notify("Employee Settlements", data?.message ?? "Sent to payout successfully.");
        closePayout();
        await fetchList();
      } else {
        setActionError(data?.message ?? "Payout failed.");
      }
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Payout failed.");
    } finally {
      setActionLoading(null);
    }
  }, [payoutItem, payoutNotes, closePayout, fetchList]);

  const actionButtons = (item: SettlementItem) => (
    <div className="flex items-center gap-1 flex-wrap">
      <button
        type="button"
        onClick={() => setDetailItem(item)}
        className="rounded-md bg-sky-600 text-white px-2 py-0.5 text-xs font-medium hover:bg-sky-700"
      >
        Details
      </button>
      <button
        type="button"
        onClick={() => openMarkSettled(item)}
        disabled={!!actionLoading}
        className="rounded-md border border-green-600 bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 hover:bg-green-100 disabled:opacity-50"
      >
        Mark Settled
      </button>
      <button
        type="button"
        onClick={() => openPayout(item)}
        disabled={!!actionLoading}
        className="rounded-md border border-slate-600 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
      >
        Payout
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
            className="rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-800 hover:bg-indigo-100"
          >
            ← Minimize
          </button>
          <button
            type="button"
            onClick={fetchList}
            className="rounded-lg bg-indigo-500 text-white px-3 py-1.5 text-sm font-medium hover:bg-indigo-600"
          >
            Refresh
          </button>
        </div>
        {actionError && <p className="text-red-600 text-sm">{actionError}</p>}
        {loading ? (
          <p className="text-indigo-700/70">Loading…</p>
        ) : error ? (
          <p className="text-red-600 text-sm">{error}</p>
        ) : items.length === 0 ? (
          <div className="text-indigo-700/70 space-y-1">
            <p>No employee settlements.</p>
            {hint && <p className="text-xs text-slate-500 mt-2">{hint}</p>}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-indigo-200/80 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-indigo-200/80 bg-indigo-50/80 text-left text-indigo-900 font-medium">
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
                  <tr key={s.ledgerId} className="border-b border-indigo-100/80 hover:bg-indigo-50/60">
                    <td className="p-2">
                      <span className="font-medium text-slate-800 block">{s.employeeName}</span>
                      <span className="text-xs text-slate-500">{s.voucherNumber}</span>
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

        {/* Detail modal */}
        <Modal open={!!detailItem} onClose={() => setDetailItem(null)} title="Settlement details">
          {detailItem && (
            <div className="space-y-3 text-sm">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
                <dt className="text-slate-500">Employee</dt>
                <dd className="font-medium">{detailItem.employeeName}</dd>
                <dt className="text-slate-500">Ledger Id</dt>
                <dd className="font-mono text-xs">{detailItem.ledgerId}</dd>
                <dt className="text-slate-500">Voucher</dt>
                <dd>{detailItem.voucherNumber}</dd>
                <dt className="text-slate-500">Entity</dt>
                <dd>{detailItem.entityName}</dd>
                <dt className="text-slate-500">Type</dt>
                <dd>{detailItem.type}</dd>
                <dt className="text-slate-500">Date</dt>
                <dd>{detailItem.date}</dd>
                <dt className="text-slate-500">Amount</dt>
                <dd className="font-semibold">{detailItem.amount}</dd>
              </dl>
              <button
                type="button"
                onClick={() => setDetailItem(null)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          )}
        </Modal>

        {/* Mark Settled modal */}
        <Modal open={!!markSettledItem} onClose={closeMarkSettled} title="Mark Settled">
          {markSettledItem && (
            <div className="space-y-4">
              <p className="text-slate-600 text-sm">To mark this settlement as settled, enter payment details.</p>
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Payment Mode</label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
                >
                  <option value="">Select payment mode</option>
                  {PAYMENT_MODE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">UTR / Cheque Number</label>
              <input
                type="text"
                value={utrOrChequeNumber}
                onChange={(e) => setUtrOrChequeNumber(e.target.value)}
                placeholder="UTR or Cheque Number"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            {actionError && <p className="text-red-600 text-xs">{actionError}</p>}
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={closeMarkSettled} className="rounded-lg border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-50">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleMarkSettledSubmit}
                disabled={!!actionLoading}
                className="rounded-lg bg-green-600 text-white px-3 py-1.5 font-medium hover:bg-green-700 disabled:opacity-50"
              >
                {actionLoading === markSettledItem.ledgerId ? "…" : "Mark Settled"}
              </button>
            </div>
          </div>
        )}
        </Modal>

        {/* Payout modal */}
        <Modal open={!!payoutItem} onClose={closePayout} title="Send to Payout">
          {payoutItem && (
            <div className="space-y-4">
              <p className="text-slate-600 text-sm">You can add notes or custom data for this payout (optional).</p>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes (optional)</label>
                <textarea
                  value={payoutNotes}
                  onChange={(e) => setPayoutNotes(e.target.value)}
                  placeholder="Notes or reference"
                  rows={3}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              {actionError && <p className="text-red-600 text-xs">{actionError}</p>}
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={closePayout} className="rounded-lg border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-50">
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handlePayoutSubmit}
                  disabled={!!actionLoading}
                  className="rounded-lg bg-indigo-600 text-white px-3 py-1.5 font-medium hover:bg-indigo-700 disabled:opacity-50"
                >
                  {actionLoading === payoutItem.ledgerId ? "…" : "Send to Payout"}
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
      <WidgetWrapper title="Employee Settlements" variant="workflow" icon={<IconBriefcase />} onMaximize={onMaximize}>
        {actionError && <p className="text-red-600 text-xs mb-1">{actionError}</p>}
        {loading ? (
          <p className="text-sm text-indigo-700/70">Loading…</p>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : preview.length === 0 ? (
          <div className="text-sm text-indigo-700/70 space-y-1">
            <p>No employee settlements.</p>
            {hint && <p className="text-xs text-slate-500 mt-2">{hint}</p>}
          </div>
        ) : (
          <ul className="space-y-1.5 max-h-[180px] overflow-auto">
            {preview.map((s) => (
              <li
                key={s.ledgerId}
                className="py-2 px-2.5 rounded-lg bg-indigo-50/80 border border-indigo-200/60 flex justify-between items-center gap-2"
              >
                <div className="min-w-0 flex-1">
                  <span className="font-mono text-xs text-slate-600 block">{s.ledgerId}</span>
                  <span className="text-slate-800 font-medium block truncate">{s.employeeName}</span>
                  <span className="text-muted text-xs">{s.amount}</span>
                </div>
                <div className="shrink-0">{actionButtons(s)}</div>
              </li>
            ))}
          </ul>
        )}
      </WidgetWrapper>

      {/* Detail modal (dashboard) */}
      <Modal open={!!detailItem} onClose={() => setDetailItem(null)} title="Settlement details">
        {detailItem && (
          <div className="space-y-3 text-sm">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
              <dt className="text-slate-500">Employee</dt>
              <dd className="font-medium">{detailItem.employeeName}</dd>
              <dt className="text-slate-500">Ledger Id</dt>
              <dd className="font-mono text-xs">{detailItem.ledgerId}</dd>
              <dt className="text-slate-500">Voucher</dt>
              <dd>{detailItem.voucherNumber}</dd>
              <dt className="text-slate-500">Type</dt>
              <dd>{detailItem.type}</dd>
              <dt className="text-slate-500">Date</dt>
              <dd>{detailItem.date}</dd>
              <dt className="text-slate-500">Amount</dt>
              <dd className="font-semibold">{detailItem.amount}</dd>
            </dl>
            <button type="button" onClick={() => setDetailItem(null)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-50">
              Close
            </button>
          </div>
        )}
      </Modal>

      {/* Mark Settled modal (dashboard) */}
      <Modal open={!!markSettledItem} onClose={closeMarkSettled} title="Mark Settled">
        {markSettledItem && (
          <div className="space-y-4">
            <p className="text-slate-600 text-sm">To mark this settlement as settled, enter payment details.</p>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Payment Mode</label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
              >
                <option value="">Select payment mode</option>
                {PAYMENT_MODE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">UTR / Cheque Number</label>
              <input
                type="text"
                value={utrOrChequeNumber}
                onChange={(e) => setUtrOrChequeNumber(e.target.value)}
                placeholder="UTR or Cheque Number"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            {actionError && <p className="text-red-600 text-xs">{actionError}</p>}
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={closeMarkSettled} className="rounded-lg border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-50">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleMarkSettledSubmit}
                disabled={!!actionLoading}
                className="rounded-lg bg-green-600 text-white px-3 py-1.5 font-medium hover:bg-green-700 disabled:opacity-50"
              >
                {actionLoading === markSettledItem.ledgerId ? "…" : "Mark Settled"}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Payout modal (dashboard) */}
      <Modal open={!!payoutItem} onClose={closePayout} title="Send to Payout">
        {payoutItem && (
          <div className="space-y-4">
            <p className="text-slate-600 text-sm">You can add notes or custom data for this payout (optional).</p>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Notes (optional)</label>
              <textarea
                value={payoutNotes}
                onChange={(e) => setPayoutNotes(e.target.value)}
                placeholder="Notes or reference"
                rows={3}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            {actionError && <p className="text-red-600 text-xs">{actionError}</p>}
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={closePayout} className="rounded-lg border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-50">
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePayoutSubmit}
                disabled={!!actionLoading}
                className="rounded-lg bg-indigo-600 text-white px-3 py-1.5 font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                {actionLoading === payoutItem.ledgerId ? "…" : "Send to Payout"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
