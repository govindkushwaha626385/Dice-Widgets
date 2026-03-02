/**
 * Vouchers widget: list scraped from Dice expense vouchers page; actions: Approve, Decline, View.
 * Detail modal shows voucher details, employee details, timeline, and Approve/Decline.
 */
import { useState, useEffect, useCallback } from "react";
import { WidgetWrapper } from "../../components/WidgetWrapper";
import { Modal } from "../../components/Modal";
import { apiFetch } from "../../lib/electronApi";
import type { ScrapedVoucherItem, ScrapedVoucherDetail } from "./types";

const VOUCHERS_LIST_URL = "/api/widgets/vouchers";
const WIDGET_PREVIEW_COUNT = 3;

interface VouchersWidgetProps {
  maximized?: boolean;
  onMinimize?: () => void;
  onMaximize?: () => void;
}

function getVouchersUrl(): string {
  return VOUCHERS_LIST_URL;
}

function getVoucherDetailUrl(id: string): string {
  return `${VOUCHERS_LIST_URL}/${encodeURIComponent(id)}`;
}

function getVoucherApproveUrl(id: string): string {
  return `${VOUCHERS_LIST_URL}/${encodeURIComponent(id)}/approve`;
}

function getVoucherDeclineUrl(id: string): string {
  return `${VOUCHERS_LIST_URL}/${encodeURIComponent(id)}/decline`;
}

export function VouchersWidget({ maximized, onMinimize, onMaximize }: VouchersWidgetProps) {
  const [items, setItems] = useState<ScrapedVoucherItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ScrapedVoucherDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    setHint(null);
    try {
      const res = await apiFetch(getVouchersUrl());
      if (!res.ok) throw new Error("Failed to fetch vouchers");
      const data = (await res.json()) as { items?: ScrapedVoucherItem[]; hint?: string } | ScrapedVoucherItem[];
      const list = Array.isArray(data) ? data : (data?.items ?? []);
      const hintMsg = !Array.isArray(data) && data?.hint ? data.hint : null;
      setItems(list);
      setHint(hintMsg ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load vouchers");
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
      const res = await apiFetch(getVoucherDetailUrl(id));
      if (!res.ok) throw new Error("Failed to fetch detail");
      const data = (await res.json()) as ScrapedVoucherDetail;
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

  const handleApprove = useCallback(async (id: string) => {
    setActionLoading(id);
    try {
      const res = await apiFetch(getVoucherApproveUrl(id), { method: "POST" });
      const data = (await res.json()) as { success?: boolean; message?: string };
      if (data.success !== false) {
        await fetchList();
        if (detailId === id) {
          const dRes = await apiFetch(getVoucherDetailUrl(id));
          if (dRes.ok) setDetail((await dRes.json()) as ScrapedVoucherDetail);
        }
      }
    } finally {
      setActionLoading(null);
    }
  }, [detailId, fetchList]);

  const handleDecline = useCallback(async (id: string) => {
    setActionLoading(id);
    try {
      const res = await apiFetch(getVoucherDeclineUrl(id), { method: "POST" });
      const data = (await res.json()) as { success?: boolean; message?: string };
      if (data.success !== false) {
        await fetchList();
        if (detailId === id) {
          const dRes = await apiFetch(getVoucherDetailUrl(id));
          if (dRes.ok) setDetail((await dRes.json()) as ScrapedVoucherDetail);
        }
      }
    } finally {
      setActionLoading(null);
    }
  }, [detailId, fetchList]);

  const preview = items.slice(0, maximized ? undefined : WIDGET_PREVIEW_COUNT);

  if (maximized) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onMinimize}
            className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-sm font-medium text-rose-800 hover:bg-rose-100"
          >
            ← Minimize
          </button>
          <button
            type="button"
            onClick={fetchList}
            className="rounded-lg bg-rose-500 text-white px-3 py-1.5 text-sm font-medium hover:bg-rose-600"
          >
            Refresh
          </button>
        </div>
        {loading ? (
          <p className="text-rose-700/70">Loading…</p>
        ) : error ? (
          <p className="text-red-600 text-sm">{error}</p>
        ) : items.length === 0 ? (
          <div className="text-rose-700/70 space-y-1">
            <p>No vouchers.</p>
            {hint && <p className="text-muted mt-2">{hint}</p>}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-rose-200/80 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-rose-200/80 bg-rose-50/80 text-left text-rose-900 font-medium">
                  <th className="p-2">Details</th>
                  <th className="p-2">Office</th>
                  <th className="p-2">Department</th>
                  <th className="p-2 text-right">Amount</th>
                  <th className="p-2">Created On</th>
                  <th className="p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((v) => (
                  <tr key={v.id} className="border-b border-rose-100/80 hover:bg-rose-50/60">
                    <td className="p-2 font-mono font-medium">{v.id}</td>
                    <td className="p-2">{v.office}</td>
                    <td className="p-2">{v.department}</td>
                    <td className="p-2 text-right font-semibold tabular-nums">{v.amount}</td>
                    <td className="p-2">{v.createdOn}</td>
                    <td className="p-2">
                      <div className="flex flex-wrap gap-1">
                        <button
                          type="button"
                          onClick={() => handleApprove(v.id)}
                          disabled={!!actionLoading}
                          className="rounded bg-green-600 text-white px-2 py-1 text-xs font-medium hover:bg-green-700 disabled:opacity-50"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDecline(v.id)}
                          disabled={!!actionLoading}
                          className="rounded bg-red-600 text-white px-2 py-1 text-xs font-medium hover:bg-red-700 disabled:opacity-50"
                        >
                          Decline
                        </button>
                        <button
                          type="button"
                          onClick={() => openDetail(v.id)}
                          className="rounded-md bg-rose-500 text-white px-2 py-1 text-xs font-medium hover:bg-rose-600"
                        >
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Modal open={detailId != null} onClose={closeDetail} title={detail?.id ?? "Voucher details"}>
          <VoucherDetailContent
            detailLoading={detailLoading}
            detail={detail}
            onClose={closeDetail}
            onApprove={detailId ? () => handleApprove(detailId) : undefined}
            onDecline={detailId ? () => handleDecline(detailId) : undefined}
            actionLoading={actionLoading === detailId}
          />
        </Modal>
      </div>
    );
  }

  return (
    <>
      <WidgetWrapper title="Vouchers" variant="ticket" onMaximize={onMaximize} minHeight={false}>
        {loading ? (
          <p className="text-muted">Loading…</p>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : preview.length === 0 ? (
          <div className="text-sm text-rose-700/60 space-y-1">
            <p>No vouchers.</p>
            {hint && <p className="text-muted text-xs mt-2">{hint}</p>}
          </div>
        ) : (
          <ul className="space-y-1.5">
            {preview.map((v) => (
              <li
                key={v.id}
                className="py-2 px-2.5 rounded-lg bg-rose-50/80 border border-rose-200/60 hover:border-rose-300/60 flex justify-between items-center gap-2"
              >
                <div className="min-w-0">
                  <span className="font-mono font-semibold text-rose-700 truncate block">{v.id}</span>
                  <span className="text-muted">{v.amount}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleApprove(v.id)}
                    disabled={!!actionLoading}
                    className="rounded bg-green-600 text-white px-1.5 py-0.5 text-[10px] font-medium hover:bg-green-700 disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDecline(v.id)}
                    disabled={!!actionLoading}
                    className="rounded bg-red-600 text-white px-1.5 py-0.5 text-[10px] font-medium hover:bg-red-700 disabled:opacity-50"
                  >
                    Decline
                  </button>
                  <button
                    type="button"
                    onClick={() => openDetail(v.id)}
                    className="text-muted text-rose-600 hover:underline text-xs"
                  >
                    View
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </WidgetWrapper>
      <Modal open={detailId != null} onClose={closeDetail} title={detail?.id ?? "Voucher details"}>
        <VoucherDetailContent
          detailLoading={detailLoading}
          detail={detail}
          onClose={closeDetail}
          onApprove={detailId ? () => handleApprove(detailId) : undefined}
          onDecline={detailId ? () => handleDecline(detailId) : undefined}
          actionLoading={detailId ? actionLoading === detailId : false}
        />
      </Modal>
    </>
  );
}

function VoucherDetailContent({
  detailLoading,
  detail,
  onClose,
  onApprove,
  onDecline,
  actionLoading,
}: {
  detailLoading: boolean;
  detail: ScrapedVoucherDetail | null;
  onClose: () => void;
  onApprove?: () => void;
  onDecline?: () => void;
  actionLoading: boolean;
}) {
  if (detailLoading) {
    return <p className="text-muted">Loading…</p>;
  }
  if (!detail) {
    return <p className="text-muted">Could not load details.</p>;
  }
  return (
    <div className="space-y-4 text-sm">
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {onApprove && (
          <button
            type="button"
            onClick={onApprove}
            disabled={actionLoading}
            className="rounded-lg bg-green-600 text-white px-3 py-1.5 font-medium hover:bg-green-700 disabled:opacity-50 flex items-center gap-1"
          >
            <span className="text-base">✓</span> Approve
          </button>
        )}
        {onDecline && (
          <button
            type="button"
            onClick={onDecline}
            disabled={actionLoading}
            className="rounded-lg bg-red-600 text-white px-3 py-1.5 font-medium hover:bg-red-700 disabled:opacity-50 flex items-center gap-1"
          >
            <span className="text-base">✕</span> Decline
          </button>
        )}
      </div>
      {(detail.totalVoucherAmount || detail.voucherStatus) && (
        <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
          <h4 className="font-medium text-slate-700 mb-2">Summary</h4>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-muted">
            {detail.totalVoucherAmount && (
              <>
                <dt>Total amount</dt>
                <dd className="font-semibold text-slate-800">{detail.totalVoucherAmount}</dd>
              </>
            )}
            {detail.totalReimbursedAmount && (
              <>
                <dt>Reimbursed</dt>
                <dd className="font-semibold text-slate-800">{detail.totalReimbursedAmount}</dd>
              </>
            )}
            {detail.voucherStatus && (
              <>
                <dt>Status</dt>
                <dd className="font-medium text-amber-700">{detail.voucherStatus}</dd>
              </>
            )}
          </dl>
        </div>
      )}
      {Object.keys(detail.voucherDetails).length > 0 && (
        <div>
          <h4 className="font-medium text-slate-700 mb-2">Voucher details</h4>
          <dl className="space-y-1">
            {Object.entries(detail.voucherDetails).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4">
                <dt className="text-muted capitalize">{k}</dt>
                <dd className="text-slate-800">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
      {Object.keys(detail.employeeDetails).length > 0 && (
        <div>
          <h4 className="font-medium text-slate-700 mb-2">Employee details</h4>
          <dl className="space-y-1">
            {Object.entries(detail.employeeDetails).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4">
                <dt className="text-muted capitalize">{k}</dt>
                <dd className="text-slate-800">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
      {detail.timeline.length > 0 && (
        <div>
          <h4 className="font-medium text-slate-700 mb-2">Timeline</h4>
          <ul className="space-y-2">
            {detail.timeline.map((t, i) => (
              <li key={i} className="pl-3 border-l-2 border-rose-200">
                <span className="font-medium text-slate-800 block">{t.title}</span>
                {t.meta && <p className="text-muted text-xs">{t.meta}</p>}
                {t.time && <p className="text-muted text-xs">{t.time}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}
      <button
        type="button"
        onClick={onClose}
        className="rounded-lg border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50"
      >
        Close
      </button>
    </div>
  );
}
