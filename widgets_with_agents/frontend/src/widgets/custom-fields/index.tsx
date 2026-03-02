/** Custom fields widget: define reusable form fields (text, date, number, etc.). Uses Supabase "custom_fields". */
import { useState, useEffect } from "react";
import { WidgetWrapper } from "../../components/WidgetWrapper";
import { Modal } from "../../components/Modal";
import { supabase } from "../../lib/supabase";
import { notify } from "../../lib/electronApi";
import type { CustomField } from "../../types/database";

const typeLabels: Record<CustomField["type"], string> = {
  text: "Text",
  date: "Date",
  number: "Number",
  email: "Email",
  textarea: "Long text",
  select: "Select",
};

interface CustomFieldsWidgetProps {
  maximized?: boolean;
  onMinimize?: () => void;
  onMaximize?: () => void;
}

export function CustomFieldsWidget({ maximized, onMinimize, onMaximize }: CustomFieldsWidgetProps) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(true);
  const limit = maximized ? 100 : 5;

  useEffect(() => {
    const fetchFields = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("custom_fields").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(limit);
      setItems((data as CustomField[]) ?? []);
      setLoading(false);
    };
    fetchFields();
  }, [open, maximized, limit]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("custom_fields").insert({
      user_id: user.id,
      title: fd.get("title") as string,
      field_id: (fd.get("field_id") as string) || `field_${Date.now()}`,
      type: (fd.get("type") as CustomField["type"]) || "text",
      placeholder: (fd.get("placeholder") as string) || null,
    });
    setOpen(false);
    form.reset();
    notify("Custom field added", (fd.get("title") as string) || "New field");
  }

  if (maximized) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <button type="button" onClick={onMinimize} className="rounded-lg border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50">← Minimize</button>
          <button type="button" onClick={() => setOpen(true)} className="rounded-lg bg-slate-700 text-white px-4 py-2 font-medium hover:bg-slate-800">+ Add field</button>
        </div>
        {loading ? <p className="text-slate-500">Loading…</p> : items.length === 0 ? <p className="text-slate-500">No custom fields yet.</p> : (
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-600 font-medium"><th className="p-3">Title</th><th className="p-3">Field ID</th><th className="p-3">Type</th><th className="p-3">Placeholder</th></tr></thead>
              <tbody>
                {items.map((f) => (
                  <tr key={f.id} className="border-b border-slate-100"><td className="p-3 font-medium">{f.title}</td><td className="p-3 font-mono">{f.field_id}</td><td className="p-3">{typeLabels[f.type]}</td><td className="p-3">{f.placeholder ?? "—"}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Modal open={open} onClose={() => setOpen(false)} title="Add Custom Field">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Title</label><input name="title" required className="w-full rounded-lg border border-slate-300 px-3 py-2" /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Field ID</label><input name="field_id" className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm" placeholder="e.g. my_field" /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Type</label><select name="type" className="w-full rounded-lg border border-slate-300 px-3 py-2">{(["text", "date", "number", "email", "textarea", "select"] as const).map((t) => <option key={t} value={t}>{typeLabels[t]}</option>)}</select></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Placeholder</label><input name="placeholder" className="w-full rounded-lg border border-slate-300 px-3 py-2" /></div>
            <div className="flex gap-2 pt-2"><button type="submit" className="rounded-lg bg-slate-700 text-white px-4 py-2 font-medium hover:bg-slate-800">Save</button><button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50">Cancel</button></div>
          </form>
        </Modal>
      </div>
    );
  }

  return (
    <>
      <WidgetWrapper title="Custom Fields" variant="formBuilder" onAddClick={() => setOpen(true)} onMaximize={onMaximize} addLabel="Add field">
        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-slate-500">No custom fields. Click + to define.</p>
        ) : (
          <ul className="space-y-2">
            {items.map((f) => (
              <li
                key={f.id}
                className="flex items-center gap-2 py-2 px-3 rounded-lg bg-white border border-slate-200"
              >
                <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-slate-200 text-slate-600">
                  {typeLabels[f.type]}
                </span>
                <span className="font-medium text-slate-800 truncate">{f.title}</span>
                {f.placeholder && (
                  <span className="text-xs text-slate-400 truncate hidden sm:inline">({f.placeholder})</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </WidgetWrapper>

      <Modal open={open} onClose={() => setOpen(false)} title="Add Custom Field">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
            <input name="title" required className="w-full rounded-lg border border-slate-300 px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Field ID</label>
            <input name="field_id" className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm" placeholder="e.g. my_field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
            <select name="type" className="w-full rounded-lg border border-slate-300 px-3 py-2">
              {(["text", "date", "number", "email", "textarea", "select"] as const).map((t) => (
                <option key={t} value={t}>{typeLabels[t]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Placeholder</label>
            <input name="placeholder" className="w-full rounded-lg border border-slate-300 px-3 py-2" />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="submit" className="rounded-lg bg-slate-700 text-white px-4 py-2 font-medium hover:bg-slate-800">Save</button>
            <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50">Cancel</button>
          </div>
        </form>
      </Modal>
    </>
  );
}
