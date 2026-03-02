/** Shortcuts widget: list and open URL shortcuts. Uses Supabase table "shortcuts". */
import { useState, useEffect } from "react";
import { WidgetWrapper } from "../../components/WidgetWrapper";
import { Modal } from "../../components/Modal";
import { supabase } from "../../lib/supabase";
import { notify, openExternal } from "../../lib/electronApi";
import type { Shortcut } from "../../types/database";

interface ShortcutsWidgetProps {
  maximized?: boolean;
  onMinimize?: () => void;
  onMaximize?: () => void;
}

export function ShortcutsWidget({ maximized, onMinimize, onMaximize }: ShortcutsWidgetProps) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Shortcut[]>([]);
  const [loading, setLoading] = useState(true);
  const limit = maximized ? 100 : 6;

  useEffect(() => {
    const fetchShortcuts = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("shortcuts").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(limit);
      setItems((data as Shortcut[]) ?? []);
      setLoading(false);
    };
    fetchShortcuts();
  }, [open, maximized, limit]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("shortcuts").insert({
      user_id: user.id,
      title: fd.get("title") as string,
      url: fd.get("url") as string,
    });
    setOpen(false);
    form.reset();
    notify("Shortcut added", (fd.get("title") as string) || "New shortcut");
  }

  if (maximized) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <button type="button" onClick={onMinimize} className="rounded-lg border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50">← Minimize</button>
          <button type="button" onClick={() => setOpen(true)} className="rounded-lg bg-emerald-600 text-white px-4 py-2 font-medium hover:bg-emerald-700">+ Add shortcut</button>
        </div>
        {loading ? <p className="text-slate-500">Loading…</p> : items.length === 0 ? <p className="text-slate-500">No shortcuts yet.</p> : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {items.map((s) => (
              <li key={s.id}>
                <button type="button" onClick={() => openExternal(s.url)} className="w-full flex items-center gap-2 p-3 rounded-lg bg-white border border-emerald-200/60 hover:bg-emerald-50 text-left">
                  <span className="w-8 h-8 rounded bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">↗</span>
                  <span className="truncate font-medium">{s.title}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <Modal open={open} onClose={() => setOpen(false)} title="Add Shortcut">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Title</label><input name="title" required className="w-full rounded-lg border border-slate-300 px-3 py-2" placeholder="e.g. Gmail" /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">URL</label><input name="url" type="url" required className="w-full rounded-lg border border-slate-300 px-3 py-2" placeholder="https://..." /></div>
            <div className="flex gap-2 pt-2"><button type="submit" className="rounded-lg bg-emerald-600 text-white px-4 py-2 font-medium hover:bg-emerald-700">Save</button><button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50">Cancel</button></div>
          </form>
        </Modal>
      </div>
    );
  }

  return (
    <>
      <WidgetWrapper title="Shortcuts" variant="tiles" onAddClick={() => setOpen(true)} onMaximize={onMaximize} addLabel="Add shortcut">
        {loading ? (
          <p className="text-sm text-emerald-700/60">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-emerald-700/60">No shortcuts. Click + to add.</p>
        ) : (
          <div className="grid grid-cols-2 gap-1.5">
            {items.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => openExternal(s.url)}
                className="flex items-center gap-1.5 py-1.5 px-2 rounded-md bg-white/80 border border-emerald-200/60 hover:bg-emerald-50 hover:border-emerald-300 text-slate-800 font-medium truncate text-left"
              >
                <span className="w-6 h-6 rounded bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0 text-xs">↗</span>
                <span className="truncate">{s.title}</span>
              </button>
            ))}
          </div>
        )}
      </WidgetWrapper>

      <Modal open={open} onClose={() => setOpen(false)} title="Add Shortcut">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
            <input name="title" required className="w-full rounded-lg border border-slate-300 px-3 py-2" placeholder="e.g. Gmail" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">URL</label>
            <input name="url" type="url" required className="w-full rounded-lg border border-slate-300 px-3 py-2" placeholder="https://..." />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="submit" className="rounded-lg bg-emerald-600 text-white px-4 py-2 font-medium hover:bg-emerald-700">Save</button>
            <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50">Cancel</button>
          </div>
        </form>
      </Modal>
    </>
  );
}
