/**
 * Transfers & Accounts widget: list with View (details), Transfer (coming soon), Recall (with confirmation).
 * Data from corporate.dice.tech/app/payout; Recall via POST .../recall.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { WidgetWrapper } from "../../components/WidgetWrapper";
import { IconWallet } from "../../components/WidgetIcons";
import { Modal } from "../../components/Modal";
import { apiFetch, notify } from "../../lib/electronApi";
import type { TransferAccountItem } from "./types";

const API_BASE = "/api/widgets/transfers-accounts";
const PREVIEW_COUNT = 3;

const getListUrl = () => API_BASE;
const getRecallUrl = (transferId: string) =>
  `${API_BASE}/${encodeURIComponent(transferId)}/recall`;

interface TransfersAccountsWidgetProps {
  maximized?: boolean;
  onMinimize?: () => void;
  onMaximize?: () => void;
}

export function TransfersAccountsWidget({
  maximized,
  onMinimize,
  onMaximize,
}: TransfersAccountsWidgetProps) {
  const [items, setItems] = useState<TransferAccountItem[]>([]);
  const [hint, setHint] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detailItem, setDetailItem] = useState<TransferAccountItem | null>(null);
  const [recallItem, setRecallItem] = useState<TransferAccountItem | null>(null);
  const [recallLoading, setRecallLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    setHint(null);
    try {
      const res = await apiFetch(getListUrl());
      if (!res.ok) throw new Error("Failed to fetch transfers");
      const data = (await res.json()) as { items?: TransferAccountItem[]; hint?: string };
      setItems(data?.items ?? []);
      setHint(data?.hint ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load transfers");
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

  const openRecall = useCallback((item: TransferAccountItem) => {
    setActionError(null);
    setRecallItem(item);
  }, []);

  const closeRecall = useCallback(() => {
    setRecallItem(null);
  }, []);

  const handleRecallConfirm = useCallback(async () => {
    const item = recallItem;
    if (!item) return;
    setRecallLoading(true);
    setActionError(null);
    try {
      const res = await apiFetch(getRecallUrl(item.transferId), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = (await res.json()) as { success?: boolean; message?: string; error?: string };
      if (res.ok && data.success !== false) {
        notify("Transfers & Accounts", data?.message ?? "Transfer recalled successfully.");
        closeRecall();
        await fetchList();
      } else {
        setActionError(data?.error ?? data?.message ?? "Recall failed.");
      }
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Recall failed.");
    } finally {
      setRecallLoading(false);
    }
  }, [recallItem, closeRecall, fetchList]);

  const actionButtons = (item: TransferAccountItem) => (
    <div className="flex items-center gap-1 flex-wrap">
      <button
        type="button"
        onClick={() => setDetailItem(item)}
        className="rounded-md bg-sky-600 text-white px-2 py-0.5 text-xs font-medium hover:bg-sky-700"
      >
        View
      </button>
      <button
        type="button"
        disabled
        title="Coming soon"
        className="rounded-md border border-slate-300 bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-400 cursor-not-allowed"
      >
        Transfer
      </button>
      <button
        type="button"
        onClick={() => openRecall(item)}
        disabled={!!recallLoading}
        className="rounded-md border border-red-600 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
      >
        Recall
      </button>
    </div>
  );

  const detailContent = (item: TransferAccountItem) => (
    <div className="space-y-3 text-sm">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
        <dt className="text-slate-500">Transfer ID</dt>
        <dd className="font-mono text-xs break-all">{item.transferId}</dd>
        <dt className="text-slate-500">Name</dt>
        <dd className="font-medium">{item.name || "—"}</dd>
        {item.number && (
          <>
            <dt className="text-slate-500">Number</dt>
            <dd>{item.number}</dd>
          </>
        )}
        <dt className="text-slate-500">Added On</dt>
        <dd>{item.addedOn || "—"}</dd>
        <dt className="text-slate-500">Office</dt>
        <dd>{item.office || "—"}</dd>
        <dt className="text-slate-500">Status</dt>
        <dd>{item.status || "—"}</dd>
        <dt className="text-slate-500">Account</dt>
        <dd>{item.account || "—"}</dd>
        <dt className="text-slate-500">Amount</dt>
        <dd className="font-semibold">{item.amount || "—"}</dd>
      </dl>
      <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200">
        <button
          type="button"
          onClick={() => {
            setDetailItem(null);
            openRecall(item);
          }}
          disabled={!!recallLoading}
          className="rounded-md border border-red-600 bg-red-50 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
        >
          Recall
        </button>
        <button
          type="button"
          onClick={() => setDetailItem(null)}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-50"
        >
          Close
        </button>
      </div>
    </div>
  );

  const recallModalContent = recallItem ? (
    <div className="space-y-4">
      <p className="text-slate-600 text-sm">You can recall your payout.</p>
      <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-sm space-y-1">
        <p className="font-mono text-xs text-slate-600">#{recallItem.transferId}</p>
        <p>
          Transfer for <strong>{recallItem.name}</strong>
          {recallItem.number && ` (${recallItem.number})`}
        </p>
        {recallItem.addedOn && (
          <p className="text-slate-500">Added On {recallItem.addedOn}</p>
        )}
      </div>
      {actionError && <p className="text-red-600 text-xs">{actionError}</p>}
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={closeRecall}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleRecallConfirm}
          disabled={recallLoading}
          className="rounded-lg bg-red-600 text-white px-3 py-1.5 font-medium hover:bg-red-700 disabled:opacity-50"
        >
          {recallLoading ? "…" : "Recall Transfer"}
        </button>
      </div>
    </div>
  ) : null;

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
            <p>No transfers.</p>
            {hint && <p className="text-xs text-slate-500 mt-2">{hint}</p>}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-indigo-200/80 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-indigo-200/80 bg-indigo-50/80 text-left text-indigo-900 font-medium">
                  <th className="p-2">Details</th>
                  <th className="p-2">Status</th>
                  <th className="p-2">Account</th>
                  <th className="p-2 text-right">Amount</th>
                  <th className="p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((t) => (
                  <tr
                    key={t.transferId}
                    className="border-b border-indigo-100/80 hover:bg-indigo-50/60"
                  >
                    <td className="p-2">
                      <span className="font-medium text-slate-800 block">{t.name || t.transferId}</span>
                      {t.addedOn && (
                        <span className="text-xs text-slate-500">{t.addedOn}</span>
                      )}
                    </td>
                    <td className="p-2">{t.status}</td>
                    <td className="p-2">{t.account}</td>
                    <td className="p-2 text-right font-medium">{t.amount}</td>
                    <td className="p-2">{actionButtons(t)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Modal open={!!detailItem} onClose={() => setDetailItem(null)} title="Transfer details">
          {detailItem && detailContent(detailItem)}
        </Modal>

        <Modal open={!!recallItem} onClose={closeRecall} title="Recall Transfer">
          {recallModalContent}
        </Modal>
      </div>
    );
  }

  return (
    <>
      <WidgetWrapper
        title="Transfers & Accounts"
        variant="ticket"
        icon={<IconWallet />}
        onMaximize={onMaximize}
      >
        {actionError && <p className="text-red-600 text-xs mb-1">{actionError}</p>}
        {loading ? (
          <p className="text-sm text-indigo-700/70">Loading…</p>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : preview.length === 0 ? (
          <div className="text-sm text-indigo-700/70 space-y-1">
            <p>No transfers.</p>
            {hint && <p className="text-xs text-slate-500 mt-2">{hint}</p>}
          </div>
        ) : (
          <ul className="space-y-1.5 max-h-[180px] overflow-auto">
            {preview.map((t) => (
              <li
                key={t.transferId}
                className="py-2 px-2.5 rounded-lg bg-indigo-50/80 border border-indigo-200/60 flex justify-between items-center gap-2"
              >
                <div className="min-w-0 flex-1">
                  <span className="font-mono text-xs text-slate-600 block truncate">
                    #{t.transferId.slice(0, 12)}…
                  </span>
                  <span className="text-slate-800 font-medium block truncate">
                    {t.name || "—"}
                  </span>
                  <span className="text-muted text-xs">{t.amount}</span>
                </div>
                <div className="shrink-0">{actionButtons(t)}</div>
              </li>
            ))}
          </ul>
        )}
      </WidgetWrapper>

      <Modal open={!!detailItem} onClose={() => setDetailItem(null)} title="Transfer details">
        {detailItem && detailContent(detailItem)}
      </Modal>

      <Modal open={!!recallItem} onClose={closeRecall} title="Recall Transfer">
        {recallModalContent}
      </Modal>
    </>
  );
}
