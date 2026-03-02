/** Products widget: list and add products (name, SKU, quantity, price). Uses Supabase table "products". */
import { useState, useEffect } from "react";
import { WidgetWrapper } from "../../components/WidgetWrapper";
import { Modal } from "../../components/Modal";
import { supabase } from "../../lib/supabase";
import { notify } from "../../lib/electronApi";
import type { Product } from "../../types/database";

interface ProductsWidgetProps {
  maximized?: boolean;
  onMinimize?: () => void;
  onMaximize?: () => void;
}

export function ProductsWidget({ maximized, onMinimize, onMaximize }: ProductsWidgetProps) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const limit = maximized ? 200 : 3;

  useEffect(() => {
    const fetchProducts = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("products").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(limit);
      setItems((data as Product[]) ?? []);
      setLoading(false);
    };
    fetchProducts();
  }, [open, maximized, limit]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("products").insert({
      user_id: user.id,
      name: fd.get("name") as string,
      sku: (fd.get("sku") as string) || null,
      description: (fd.get("description") as string) || null,
      quantity: Number(fd.get("quantity")) || 0,
      unit_price: Number(fd.get("unit_price")) || 0,
    });
    setOpen(false);
    form.reset();
    notify("Product added", (fd.get("name") as string) || "New product");
  }

  if (maximized) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <button type="button" onClick={onMinimize} className="rounded-lg border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50">← Minimize</button>
          <button type="button" onClick={() => setOpen(true)} className="rounded-lg bg-sky-600 text-white px-4 py-2 font-medium hover:bg-sky-700">+ Add product</button>
        </div>
        {loading ? <p className="text-slate-500">Loading…</p> : items.length === 0 ? <p className="text-slate-500">No products yet.</p> : (
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-600 font-medium"><th className="p-3">Name</th><th className="p-3">SKU</th><th className="p-3 text-right">Qty</th><th className="p-3 text-right">Unit price</th></tr></thead>
              <tbody>
                {items.map((p) => (
                  <tr key={p.id} className="border-b border-slate-100"><td className="p-3 font-medium">{p.name}</td><td className="p-3 font-mono">{p.sku ?? "—"}</td><td className="p-3 text-right">{p.quantity}</td><td className="p-3 text-right">₹{Number(p.unit_price).toLocaleString()}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Modal open={open} onClose={() => setOpen(false)} title="Add Product">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Name</label><input name="name" required className="w-full rounded-lg border border-slate-300 px-3 py-2" /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">SKU</label><input name="sku" className="w-full rounded-lg border border-slate-300 px-3 py-2" /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Description</label><textarea name="description" rows={2} className="w-full rounded-lg border border-slate-300 px-3 py-2" /></div>
            <div className="grid grid-cols-2 gap-3"><div><label className="block text-sm font-medium text-slate-700 mb-1">Quantity</label><input name="quantity" type="number" min={0} defaultValue={0} className="w-full rounded-lg border border-slate-300 px-3 py-2" /></div><div><label className="block text-sm font-medium text-slate-700 mb-1">Unit price</label><input name="unit_price" type="number" step="0.01" min={0} required className="w-full rounded-lg border border-slate-300 px-3 py-2" /></div></div>
            <div className="flex gap-2 pt-2"><button type="submit" className="rounded-lg bg-sky-600 text-white px-4 py-2 font-medium hover:bg-sky-700">Save</button><button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50">Cancel</button></div>
          </form>
        </Modal>
      </div>
    );
  }

  return (
    <>
      <WidgetWrapper title="Products" variant="inventory" onAddClick={() => setOpen(true)} onMaximize={onMaximize} addLabel="Add product">
        {loading ? (
          <p className="text-sm text-sky-700/60">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-sky-700/60">No products. Click + to add.</p>
        ) : (
          <ul className="space-y-1">
            {items.map((p) => (
              <li key={p.id} className="flex justify-between items-center gap-2 py-1.5 px-2 rounded-md bg-white/80 border border-sky-200/60">
                <div className="min-w-0">
                  <span className="font-medium text-slate-800 block truncate">{p.name}</span>
                  {p.sku && <span className="text-muted font-mono">{p.sku}</span>}
                </div>
                <div className="text-right shrink-0">
                  <span className="text-sky-700 font-semibold">×{p.quantity}</span>
                  <span className="text-muted block">₹{Number(p.unit_price).toLocaleString()}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </WidgetWrapper>

      <Modal open={open} onClose={() => setOpen(false)} title="Add Product">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
            <input name="name" required className="w-full rounded-lg border border-slate-300 px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">SKU</label>
            <input name="sku" className="w-full rounded-lg border border-slate-300 px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea name="description" rows={2} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Quantity</label>
              <input name="quantity" type="number" min={0} defaultValue={0} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Unit price</label>
              <input name="unit_price" type="number" step="0.01" min={0} required className="w-full rounded-lg border border-slate-300 px-3 py-2" />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="submit" className="rounded-lg bg-sky-600 text-white px-4 py-2 font-medium hover:bg-sky-700">Save</button>
            <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50">Cancel</button>
          </div>
        </form>
      </Modal>
    </>
  );
}
