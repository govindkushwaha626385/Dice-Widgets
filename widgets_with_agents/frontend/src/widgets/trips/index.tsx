/** Trips widget: list, add, approve/decline trips. Uses Supabase table "trips". */
import { useState, useEffect } from "react";
import { WidgetWrapper } from "../../components/WidgetWrapper";
import { Modal } from "../../components/Modal";
import { supabase } from "../../lib/supabase";
import { notify } from "../../lib/electronApi";
import type { Trip, ApprovalStatus } from "../../types/database";

interface TripsWidgetProps {
  maximized?: boolean;
  onMinimize?: () => void;
  onMaximize?: () => void;
}

function statusBadge(status: ApprovalStatus | undefined) {
  const s = status ?? "pending";
  const classes = s === "approved" ? "bg-green-100 text-green-800" : s === "declined" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800";
  return <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${classes}`}>{s}</span>;
}

export function TripsWidget({ maximized, onMinimize, onMaximize }: TripsWidgetProps) {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<Trip | null>(null);
  const [items, setItems] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const limit = maximized ? 200 : 2;

  useEffect(() => {
    const fetchTrips = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("trips").select("*").eq("user_id", user.id).order("start_date", { ascending: false }).limit(limit);
      setItems((data as Trip[]) ?? []);
      setLoading(false);
    };
    fetchTrips();
  }, [open, maximized, limit]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("trips").insert({
      user_id: user.id,
      title: fd.get("title") as string,
      start_date: fd.get("start_date") as string,
      end_date: fd.get("end_date") as string,
      source: (fd.get("source") as string) || null,
      destination: (fd.get("destination") as string) || null,
      amount: fd.get("amount") ? Number(fd.get("amount")) : null,
    });
    setOpen(false);
    form.reset();
    notify("Trip added", (fd.get("title") as string) || "New trip");
  }

  async function updateStatus(id: string, status: ApprovalStatus) {
    await supabase.from("trips").update({ status }).eq("id", id);
    setItems((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
    notify("Trip " + status, status);
  }

  if (maximized) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <button type="button" onClick={onMinimize} className="rounded-lg border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50">← Minimize</button>
          <button type="button" onClick={() => setOpen(true)} className="rounded-lg bg-indigo-600 text-white px-4 py-2 font-medium hover:bg-indigo-700">+ Add trip</button>
        </div>
        {loading ? <p className="text-slate-500">Loading…</p> : items.length === 0 ? <p className="text-slate-500">No trips yet.</p> : (
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-600 font-medium"><th className="p-3">Title</th><th className="p-3">Route</th><th className="p-3">Dates</th><th className="p-3 text-right">Amount</th><th className="p-3">Status</th><th className="p-3">Actions</th></tr></thead>
              <tbody>
                {items.map((t) => {
                  const status = (t.status ?? "pending") as ApprovalStatus;
                  return (
                    <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="p-3 font-medium">{t.title}</td>
                      <td className="p-3">{t.source ?? "—"} → {t.destination ?? "—"}</td>
                      <td className="p-3">{t.start_date} – {t.end_date}</td>
                      <td className="p-3 text-right">{t.amount != null ? `₹${Number(t.amount).toLocaleString()}` : "—"}</td>
                      <td className="p-3">{statusBadge(status)}</td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {status === "pending" && (
                            <>
                              <button type="button" onClick={() => updateStatus(t.id, "approved")} className="rounded bg-green-600 text-white px-2 py-1 text-xs font-medium hover:bg-green-700">Approve</button>
                              <button type="button" onClick={() => updateStatus(t.id, "declined")} className="rounded bg-red-600 text-white px-2 py-1 text-xs font-medium hover:bg-red-700">Decline</button>
                            </>
                          )}
                          <button type="button" onClick={() => setDetail(t)} className="rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">Details</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <Modal open={!!detail} onClose={() => setDetail(null)} title="Trip details">
          {detail && (
            <div className="space-y-3 text-sm">
              <p><span className="font-medium text-slate-500">Title</span> {detail.title}</p>
              <p><span className="font-medium text-slate-500">Start – End</span> {detail.start_date} – {detail.end_date}</p>
              <p><span className="font-medium text-slate-500">Source</span> {detail.source ?? "—"}</p>
              <p><span className="font-medium text-slate-500">Destination</span> {detail.destination ?? "—"}</p>
              <p><span className="font-medium text-slate-500">Amount</span> {detail.amount != null ? `₹${Number(detail.amount).toLocaleString()}` : "—"}</p>
              <p><span className="font-medium text-slate-500">Status</span> {statusBadge((detail.status ?? "pending") as ApprovalStatus)}</p>
              <button type="button" onClick={() => setDetail(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50">Close</button>
            </div>
          )}
        </Modal>
        <Modal open={open} onClose={() => setOpen(false)} title="Add Trip">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Title</label><input name="title" required className="w-full rounded-lg border border-slate-300 px-3 py-2" /></div>
            <div className="grid grid-cols-2 gap-3"><div><label className="block text-sm font-medium text-slate-700 mb-1">Start</label><input name="start_date" type="date" required className="w-full rounded-lg border border-slate-300 px-3 py-2" /></div><div><label className="block text-sm font-medium text-slate-700 mb-1">End</label><input name="end_date" type="date" required className="w-full rounded-lg border border-slate-300 px-3 py-2" /></div></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Source</label><input name="source" className="w-full rounded-lg border border-slate-300 px-3 py-2" /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Destination</label><input name="destination" className="w-full rounded-lg border border-slate-300 px-3 py-2" /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Amount</label><input name="amount" type="number" step="0.01" className="w-full rounded-lg border border-slate-300 px-3 py-2" /></div>
            <div className="flex gap-2 pt-2"><button type="submit" className="rounded-lg bg-indigo-600 text-white px-4 py-2 font-medium hover:bg-indigo-700">Save</button><button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50">Cancel</button></div>
          </form>
        </Modal>
      </div>
    );
  }

  return (
    <>
      <WidgetWrapper title="Trips" variant="journey" onAddClick={() => setOpen(true)} onMaximize={onMaximize} addLabel="Add trip">
        {loading ? (
          <p className="text-sm text-indigo-700/60">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-indigo-700/60">No trips. Click + to add.</p>
        ) : (
          <ul className="space-y-1.5">
            {items.map((t) => (
              <li key={t.id} className="relative pl-3 border-l-2 border-indigo-300 flex justify-between items-start gap-2 py-0.5">
                <div className="min-w-0">
                  <span className="text-slate-800 font-medium block truncate">{t.title}</span>
                  <span className="text-muted">{t.source || "—"} → {t.destination || "—"}</span>
                  <span className="text-muted block">{t.start_date} – {t.end_date}{t.amount != null && ` · ₹${Number(t.amount).toLocaleString()}`}</span>
                  {statusBadge((t.status ?? "pending") as ApprovalStatus)}
                </div>
                <button type="button" onClick={() => setDetail(t)} className="text-muted text-indigo-600 hover:underline shrink-0">Details</button>
              </li>
            ))}
          </ul>
        )}
      </WidgetWrapper>
      <Modal open={!!detail} onClose={() => setDetail(null)} title="Trip details">
        {detail && (
          <div className="space-y-3 text-sm">
            <p><span className="font-medium text-slate-500">Title</span> {detail.title}</p>
            <p><span className="font-medium text-slate-500">Start – End</span> {detail.start_date} – {detail.end_date}</p>
            <p><span className="font-medium text-slate-500">Source</span> {detail.source ?? "—"}</p>
            <p><span className="font-medium text-slate-500">Destination</span> {detail.destination ?? "—"}</p>
            <p><span className="font-medium text-slate-500">Amount</span> {detail.amount != null ? `₹${Number(detail.amount).toLocaleString()}` : "—"}</p>
            <p><span className="font-medium text-slate-500">Status</span> {statusBadge((detail.status ?? "pending") as ApprovalStatus)}</p>
            <button type="button" onClick={() => setDetail(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50">Close</button>
          </div>
        )}
      </Modal>
      <Modal open={open} onClose={() => setOpen(false)} title="Add Trip">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
            <input name="title" required className="w-full rounded-lg border border-slate-300 px-3 py-2" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Start</label>
              <input name="start_date" type="date" required className="w-full rounded-lg border border-slate-300 px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">End</label>
              <input name="end_date" type="date" required className="w-full rounded-lg border border-slate-300 px-3 py-2" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Source</label>
            <input name="source" className="w-full rounded-lg border border-slate-300 px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Destination</label>
            <input name="destination" className="w-full rounded-lg border border-slate-300 px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Amount</label>
            <input name="amount" type="number" step="0.01" className="w-full rounded-lg border border-slate-300 px-3 py-2" />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="submit" className="rounded-lg bg-indigo-600 text-white px-4 py-2 font-medium hover:bg-indigo-700">Save</button>
            <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50">Cancel</button>
          </div>
        </form>
      </Modal>
    </>
  );
}
