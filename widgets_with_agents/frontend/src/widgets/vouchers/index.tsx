/**
 * Vouchers widget: list from scraper; actions Approve, Decline, View.
 * Approve/Decline call backend → Heimdall API. Detail modal shows full voucher + timeline.
 */

import { useState, useEffect, useCallback } from "react";
import { WidgetWrapper } from "../../components/WidgetWrapper";
import { Modal } from "../../components/Modal";
import { apiFetch, notify } from "../../lib/electronApi";
import type { ScrapedVoucherItem, ScrapedVoucherDetail } from "./types";

// API paths (backend routes under /api)
const API_BASE = "/api/widgets/vouchers";
const PREVIEW_COUNT = 3;

const getListUrl = () => API_BASE;
const getDetailUrl = (id: string) => `${API_BASE}/${encodeURIComponent(id)}`;
const getApproveUrl = (id: string) => `${API_BASE}/${encodeURIComponent(id)}/approve`;
const getDeclineUrl = (id: string) => `${API_BASE}/${encodeURIComponent(id)}/decline`;

interface VouchersWidgetProps {
  maximized?: boolean;
  onMinimize?: () => void;
  onMaximize?: () => void;
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
  const [declineModalId, setDeclineModalId] = useState<string | null>(null);
  const [declineRemark, setDeclineRemark] = useState("");
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    setHint(null);
    try {
      const res = await apiFetch(getListUrl());
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

  useEffect(() => {
    if (!actionSuccess) return;
    const t = setTimeout(() => setActionSuccess(null), 4000);
    return () => clearTimeout(t);
  }, [actionSuccess]);

  useEffect(() => {
    if (!actionError) return;
    const t = setTimeout(() => setActionError(null), 8000);
    return () => clearTimeout(t);
  }, [actionError]);

  const openDetail = useCallback(async (id: string) => {
    setDetailId(id);
    setDetail(null);
    setDetailLoading(true);
    try {
      const res = await apiFetch(getDetailUrl(id));
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
    const confirmed = window.confirm("Are you sure you want to approve this voucher?");
    if (!confirmed) return;
    setActionLoading(id);
    setActionSuccess(null);
    setActionError(null);
    try {
      const res = await apiFetch(getApproveUrl(id), { method: "POST" });
      const data = (await res.json()) as { success?: boolean; message?: string };
      if (res.ok && data.success !== false) {
        notify("Voucher", "Successfully approved.");
        setActionSuccess("Successfully approved.");
        setActionError(null);
        await fetchList();
        if (detailId === id) {
          const dRes = await apiFetch(getDetailUrl(id));
          if (dRes.ok) setDetail((await dRes.json()) as ScrapedVoucherDetail);
        }
      } else {
        setActionError(data?.message ?? "Approve failed.");
      }
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Approve failed.");
    } finally {
      setActionLoading(null);
    }
  }, [detailId, fetchList]);

  const openDeclineModal = useCallback((id: string) => {
    setDeclineModalId(id);
    setDeclineRemark("");
  }, []);

  const closeDeclineModal = useCallback(() => {
    setDeclineModalId(null);
    setDeclineRemark("");
    setActionError(null);
  }, []);

  const handleDeclineSubmit = useCallback(async () => {
    const id = declineModalId;
    if (!id) return;
    setActionLoading(id);
    setActionSuccess(null);
    setActionError(null);
    try {
      const res = await apiFetch(getDeclineUrl(id), {
        method: "POST",
        body: JSON.stringify({ remarks: declineRemark }),
      });
      const data = (await res.json()) as { success?: boolean; message?: string };
      if (res.ok && data.success !== false) {
        notify("Voucher", "Successfully declined.");
        setActionSuccess("Successfully declined.");
        setActionError(null);
        closeDeclineModal();
        await fetchList();
        if (detailId === id) closeDetail();
      } else {
        setActionError(data?.message ?? "Decline failed.");
      }
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Decline failed.");
    } finally {
      setActionLoading(null);
    }
  }, [declineModalId, declineRemark, detailId, fetchList, closeDeclineModal, closeDetail]);

  const handleDecline = useCallback(
    (id: string) => openDeclineModal(id),
    [openDeclineModal]
  );

  const preview = items.slice(0, maximized ? undefined : PREVIEW_COUNT);

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
      {actionSuccess && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 rounded-lg bg-green-600 text-white px-4 py-2 text-sm font-medium shadow-lg">
          {actionSuccess}
        </div>
      )}
      {actionError && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 rounded-lg bg-red-600 text-white px-4 py-2 text-sm font-medium shadow-lg max-w-md text-center">
          {actionError}
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
            actionSuccess={actionSuccess}
            actionError={actionError}
          />
        </Modal>
      <Modal open={declineModalId != null} onClose={closeDeclineModal} title="Decline voucher">
        <DeclineRemarkForm
          actionError={actionError}
          remark={declineRemark}
          onRemarkChange={setDeclineRemark}
          onSubmit={handleDeclineSubmit}
          onCancel={closeDeclineModal}
          loading={!!(declineModalId && actionLoading === declineModalId)}
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
      {actionSuccess && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 rounded-lg bg-green-600 text-white px-4 py-2 text-sm font-medium shadow-lg">
          {actionSuccess}
        </div>
      )}
      {actionError && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 rounded-lg bg-red-600 text-white px-4 py-2 text-sm font-medium shadow-lg max-w-md text-center">
          {actionError}
        </div>
      )}
      <Modal open={detailId != null} onClose={closeDetail} title={detail?.id ?? "Voucher details"}>
        <VoucherDetailContent
          detailLoading={detailLoading}
          detail={detail}
          onClose={closeDetail}
          onApprove={detailId ? () => handleApprove(detailId) : undefined}
          onDecline={detailId ? () => handleDecline(detailId) : undefined}
          actionLoading={detailId ? actionLoading === detailId : false}
          actionSuccess={actionSuccess}
          actionError={actionError}
        />
      </Modal>
      <Modal open={declineModalId != null} onClose={closeDeclineModal} title="Decline voucher">
        <DeclineRemarkForm
          remark={declineRemark}
          onRemarkChange={setDeclineRemark}
          onSubmit={handleDeclineSubmit}
          onCancel={closeDeclineModal}
          loading={!!(declineModalId && actionLoading === declineModalId)}
          actionError={actionError}
        />
      </Modal>
    </>
  );
}

function DeclineRemarkForm({
  remark,
  onRemarkChange,
  onSubmit,
  onCancel,
  loading,
  actionError,
}: {
  remark: string;
  onRemarkChange: (v: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  loading: boolean;
  actionError?: string | null;
}) {
  return (
    <div className="space-y-4">
      {actionError && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-800 px-3 py-2 text-sm">
          {actionError}
        </div>
      )}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Remark</label>
        <textarea
          value={remark}
          onChange={(e) => onRemarkChange(e.target.value)}
          placeholder="Enter reason for decline..."
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm min-h-[80px]"
          rows={3}
        />
      </div>
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={loading}
          className="rounded-lg bg-red-600 text-white px-4 py-2 font-medium hover:bg-red-700 disabled:opacity-50"
        >
          {loading ? "Declining…" : "Decline"}
        </button>
      </div>
    </div>
  );
}

function VoucherDetailContent({
  detailLoading,
  detail,
  onClose,
  onApprove,
  onDecline,
  actionLoading,
  actionSuccess,
  actionError,
}: {
  detailLoading: boolean;
  detail: ScrapedVoucherDetail | null;
  onClose: () => void;
  onApprove?: () => void;
  onDecline?: () => void;
  actionLoading: boolean;
  actionSuccess?: string | null;
  actionError?: string | null;
}) {
  if (detailLoading) {
    return <p className="text-muted">Loading…</p>;
  }
  if (!detail) {
    return <p className="text-muted">Could not load details.</p>;
  }
  return (
    <div className="space-y-4 text-sm">
      {actionSuccess && (
        <div className="rounded-lg bg-green-50 border border-green-200 text-green-800 px-3 py-2 text-sm font-medium">
          {actionSuccess}
        </div>
      )}
      {actionError && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-800 px-3 py-2 text-sm">
          {actionError}
        </div>
      )}
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
