/**
 * Notes widget: list and add notes. Uses Supabase table "notes".
 */
import { useState, useEffect } from "react";
import { WidgetWrapper } from "../../components/WidgetWrapper";
import { Modal } from "../../components/Modal";
import { supabase } from "../../lib/supabase";
import { notify } from "../../lib/electronApi";
import type { Note } from "../../types/database";

interface NotesWidgetProps {
  maximized?: boolean;
  onMinimize?: () => void;
  onMaximize?: () => void;
}

export function NotesWidget({ maximized, onMinimize, onMaximize }: NotesWidgetProps) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const limit = maximized ? 200 : 3;

  useEffect(() => {
    const fetchNotes = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("notes").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(limit);
      setItems((data as Note[]) ?? []);
      setLoading(false);
    };
    fetchNotes();
  }, [open, maximized, limit]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("notes").insert({
      user_id: user.id,
      title: fd.get("title") as string,
      content: (fd.get("content") as string) || null,
    });
    setOpen(false);
    form.reset();
    notify("Note added", (fd.get("title") as string) || "New note");
  }

  const preview = items.slice(0, 3);

  if (maximized) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <button type="button" onClick={onMinimize} className="rounded-lg border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50">← Minimize</button>
          <button type="button" onClick={() => setOpen(true)} className="rounded-lg bg-yellow-500 text-slate-900 px-4 py-2 font-medium hover:bg-yellow-600">+ Add note</button>
        </div>
        {loading ? <p className="text-slate-500">Loading…</p> : items.length === 0 ? <p className="text-slate-500">No notes yet.</p> : (
          <ul className="space-y-2">
            {items.map((n) => (
              <li key={n.id} className="p-4 rounded-lg bg-white border border-yellow-200/60 shadow-sm">
                <span className="font-medium text-slate-800 block">{n.title}</span>
                {n.content && <p className="text-slate-600 text-sm mt-1 whitespace-pre-wrap">{n.content}</p>}
              </li>
            ))}
          </ul>
        )}
        <Modal open={open} onClose={() => setOpen(false)} title="Add Note">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Title</label><input name="title" required className="w-full rounded-lg border border-slate-300 px-3 py-2" /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Content</label><textarea name="content" rows={4} className="w-full rounded-lg border border-slate-300 px-3 py-2" /></div>
            <div className="flex gap-2 pt-2">
              <button type="submit" className="rounded-lg bg-yellow-500 text-slate-900 px-4 py-2 font-medium hover:bg-yellow-600">Save</button>
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50">Cancel</button>
            </div>
          </form>
        </Modal>
      </div>
    );
  }

  return (
    <>
      <WidgetWrapper title="Notes" variant="sticky" onAddClick={() => setOpen(true)} onMaximize={onMaximize} addLabel="Add note">
        {loading ? <p className="text-muted">Loading…</p> : preview.length === 0 ? <p className="text-muted">No notes. Click + to add.</p> : (
          <ul className="space-y-1">
            {preview.map((n) => (
              <li key={n.id} className="py-1.5 px-2 rounded-md bg-white/70 border border-yellow-200/50">
                <span className="font-medium text-slate-800 block truncate">{n.title}</span>
                {n.content && <span className="text-muted line-clamp-2 mt-0.5 block">{n.content}</span>}
              </li>
            ))}
          </ul>
        )}
      </WidgetWrapper>
      <Modal open={open} onClose={() => setOpen(false)} title="Add Note">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Title</label><input name="title" required className="w-full rounded-lg border border-slate-300 px-3 py-2" /></div>
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Content</label><textarea name="content" rows={4} className="w-full rounded-lg border border-slate-300 px-3 py-2" /></div>
          <div className="flex gap-2 pt-2">
            <button type="submit" className="rounded-lg bg-yellow-500 text-slate-900 px-4 py-2 font-medium hover:bg-yellow-600">Save</button>
            <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50">Cancel</button>
          </div>
        </form>
      </Modal>
    </>
  );
}
