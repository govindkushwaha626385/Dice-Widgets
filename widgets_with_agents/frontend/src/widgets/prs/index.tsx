/** Purchase requisitions widget: list and add PRs with approve/decline. Uses Supabase "purchase_requisitions". */
import { useState, useEffect } from "react";
import { WidgetWrapper } from "../../components/WidgetWrapper";
import { Modal } from "../../components/Modal";
import { supabase } from "../../lib/supabase";
import { notify } from "../../lib/electronApi";
import type { PurchaseRequisition } from "../../types/database";

interface PRsWidgetProps {
  maximized?: boolean;
  onMinimize?: () => void;
  onMaximize?: () => void;
}

export function PRsWidget({ maximized, onMinimize, onMaximize }: PRsWidgetProps) {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<PurchaseRequisition | null>(null);
  const [items, setItems] = useState<PurchaseRequisition[]>([]);
  const [loading, setLoading] = useState(true);
  const limit = maximized ? 200 : 3;

  useEffect(() => {
    const fetchPRs = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("purchase_requisitions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(limit);
      setItems((data as PurchaseRequisition[]) ?? []);
      setLoading(false);
    };
    fetchPRs();
  }, [open, maximized, limit]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("purchase_requisitions").insert({
      user_id: user.id,
      pr_number: fd.get("pr_number") as string,
      status: (fd.get("status") as string) || "draft",
      items: [],
    });
    setOpen(false);
    form.reset();
    notify("PR added", (fd.get("pr_number") as string) || "New PR");
  }

  const statusColor = (s: string) => {
    if (s === "approved") return "bg-green-100 text-green-800";
    if (s === "rejected") return "bg-red-100 text-red-800";
    return "bg-violet-100 text-violet-800";
  };

  async function updateStatus(id: string, status: string) {
    await supabase.from("purchase_requisitions").update({ status }).eq("id", id);
    setItems((prev) => prev.map((pr) => (pr.id === id ? { ...pr, status } : pr)));
    notify("PR " + status, status);
  }

  const canApproveDecline = (s: string) => s === "draft" || s === "submitted";

  if (maximized) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <button type="button" onClick={onMinimize} className="rounded-lg border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50">← Minimize</button>
          <button type="button" onClick={() => setOpen(true)} className="rounded-lg bg-violet-600 text-white px-4 py-2 font-medium hover:bg-violet-700">+ Add PR</button>
        </div>
        {loading ? <p className="text-slate-500">Loading…</p> : items.length === 0 ? <p className="text-slate-500">No PRs yet.</p> : (
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-600 font-medium"><th className="p-3">PR Number</th><th className="p-3">Status</th><th className="p-3">Actions</th></tr></thead>
              <tbody>
                {items.map((pr) => (
                  <tr key={pr.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="p-3 font-mono font-medium">{pr.pr_number}</td>
                    <td className="p-3"><span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${statusColor(pr.status)}`}>{pr.status}</span></td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {canApproveDecline(pr.status) && (
                          <>
                            <button type="button" onClick={() => updateStatus(pr.id, "approved")} className="rounded bg-green-600 text-white px-2 py-1 text-xs font-medium hover:bg-green-700">Approve</button>
                            <button type="button" onClick={() => updateStatus(pr.id, "rejected")} className="rounded bg-red-600 text-white px-2 py-1 text-xs font-medium hover:bg-red-700">Decline</button>
                          </>
                        )}
                        <button type="button" onClick={() => setDetail(pr)} className="rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">Details</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Modal open={!!detail} onClose={() => setDetail(null)} title="PR details">
          {detail && (
            <div className="space-y-3 text-sm">
              <p><span className="font-medium text-slate-500">PR Number</span> {detail.pr_number}</p>
              <p><span className="font-medium text-slate-500">Status</span> <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${statusColor(detail.status)}`}>{detail.status}</span></p>
              <p><span className="font-medium text-slate-500">Items</span> {Array.isArray(detail.items) ? detail.items.length : 0} item(s)</p>
              <button type="button" onClick={() => setDetail(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50">Close</button>
            </div>
          )}
        </Modal>
        <Modal open={open} onClose={() => setOpen(false)} title="Add Purchase Requisition">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><label className="block text-sm font-medium text-slate-700 mb-1">PR Number</label><input name="pr_number" required className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono" placeholder="PR-2026-001" /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Status</label><select name="status" className="w-full rounded-lg border border-slate-300 px-3 py-2"><option value="draft">Draft</option><option value="submitted">Submitted</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select></div>
            <div className="flex gap-2 pt-2"><button type="submit" className="rounded-lg bg-violet-600 text-white px-4 py-2 font-medium hover:bg-violet-700">Save</button><button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50">Cancel</button></div>
          </form>
        </Modal>
      </div>
    );
  }

  return (
    <>
      <WidgetWrapper title="Purchase Requisitions" variant="workflow" onAddClick={() => setOpen(true)} onMaximize={onMaximize} addLabel="Add PR">
        {loading ? (
          <p className="text-sm text-violet-700/60">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-violet-700/60">No PRs. Click + to add.</p>
        ) : (
          <ul className="space-y-2">
            {items.map((pr) => (
              <li key={pr.id} className="flex items-center justify-between gap-2 py-2 px-3 rounded-lg bg-white/80 border border-violet-200/80">
                <span className="font-mono text-sm font-medium text-slate-800">{pr.pr_number}</span>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded font-medium capitalize ${statusColor(pr.status)}`}>{pr.status}</span>
                  <button type="button" onClick={() => setDetail(pr)} className="text-xs text-violet-600 hover:underline">Details</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </WidgetWrapper>
      <Modal open={!!detail} onClose={() => setDetail(null)} title="PR details">
        {detail && (
          <div className="space-y-3 text-sm">
            <p><span className="font-medium text-slate-500">PR Number</span> {detail.pr_number}</p>
            <p><span className="font-medium text-slate-500">Status</span> <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${statusColor(detail.status)}`}>{detail.status}</span></p>
            <p><span className="font-medium text-slate-500">Items</span> {Array.isArray(detail.items) ? detail.items.length : 0} item(s)</p>
            <button type="button" onClick={() => setDetail(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50">Close</button>
          </div>
        )}
      </Modal>
      <Modal open={open} onClose={() => setOpen(false)} title="Add Purchase Requisition">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">PR Number</label>
            <input name="pr_number" required className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono" placeholder="PR-2026-001" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
            <select name="status" className="w-full rounded-lg border border-slate-300 px-3 py-2">
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="submit" className="rounded-lg bg-violet-600 text-white px-4 py-2 font-medium hover:bg-violet-700">Save</button>
            <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50">Cancel</button>
          </div>
        </form>
      </Modal>
    </>
  );
}
