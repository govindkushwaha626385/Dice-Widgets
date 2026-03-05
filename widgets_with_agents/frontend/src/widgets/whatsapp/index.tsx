/** WhatsApp widget: contacts list and in-app WhatsApp (Electron). Uses Supabase + Electron wwebjs. */
import { useState, useEffect, useCallback } from "react";
import { WidgetWrapper } from "../../components/WidgetWrapper";
import { IconMessage } from "../../components/WidgetIcons";
import { Modal } from "../../components/Modal";
import { supabase } from "../../lib/supabase";
import { notify, openExternal, isElectron } from "../../lib/electronApi";
import type { WhatsAppContact } from "../../types/database";
import type { WhatsAppChat, WhatsAppMessage } from "../../types/electron";

const DEFAULT_COUNTRY_CODE = "91";
const WHATSAPP_WEB_URL = "https://web.whatsapp.com";

function toWhatsAppLink(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const withCountry = digits.length <= 10 ? `${DEFAULT_COUNTRY_CODE}${digits}` : digits;
  return `whatsapp://send?phone=${withCountry}`;
}

const hasWhatsAppAPI = () => typeof window !== "undefined" && !!window.electronAPI?.whatsapp;

interface WhatsAppWidgetProps {
  maximized?: boolean;
  onMinimize?: () => void;
  onMaximize?: () => void;
}

export function WhatsAppWidget({ maximized, onMinimize, onMaximize }: WhatsAppWidgetProps) {
  const [open, setOpen] = useState(false);
  const [contacts, setContacts] = useState<WhatsAppContact[]>([]);
  const [loading, setLoading] = useState(true);

  // In-app WhatsApp (Electron only)
  const [waStatus, setWaStatus] = useState<"disconnected" | "loading" | "qr" | "ready">("disconnected");
  const [waQr, setWaQr] = useState<string | null>(null);
  const [waError, setWaError] = useState<string | null>(null);
  const [loadingSlow, setLoadingSlow] = useState(false);
  const [waChats, setWaChats] = useState<WhatsAppChat[]>([]);
  const [waChatsLoading, setWaChatsLoading] = useState(false);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [waMessages, setWaMessages] = useState<WhatsAppMessage[]>([]);
  const [waMessagesLoading, setWaMessagesLoading] = useState(false);

  useEffect(() => {
    const fetchContacts = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("whatsapp_contacts").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      setContacts((data as WhatsAppContact[]) ?? []);
      setLoading(false);
    };
    fetchContacts();
  }, [open]);

  // Subscribe to WhatsApp events (Electron)
  useEffect(() => {
    if (!hasWhatsAppAPI()) return;
    const api = window.electronAPI!.whatsapp!;
    const unqr = api.on("whatsapp-qr", (dataUrl: unknown) => {
      setWaQr(typeof dataUrl === "string" ? dataUrl : null);
      setWaStatus("qr");
      setWaError(null);
    });
    const unready = api.on("whatsapp-ready", () => {
      setWaQr(null);
      setWaStatus("ready");
      setWaError(null);
      setLoadingSlow(false);
    });
    const unstatus = api.on("whatsapp-status", (s: unknown) => {
      if (s === "loading") setWaStatus("loading");
      if (s === "disconnected") {
        setWaStatus("disconnected");
        setLoadingSlow(false);
      }
    });
    const unerr = api.on("whatsapp-error", (msg: unknown) => {
      setWaError(typeof msg === "string" ? msg : "Connection failed");
      setWaStatus("disconnected");
      setLoadingSlow(false);
    });
    return () => {
      unqr();
      unready();
      unstatus();
      unerr();
    };
  }, []);

  // Sync status with main process on mount and when maximized (catch "ready" if we missed the event)
  useEffect(() => {
    if (!hasWhatsAppAPI()) return;
    let cancelled = false;
    window.electronAPI!.whatsapp!.getStatus().then((r) => {
      if (!cancelled) {
        const s = (r.status as "disconnected" | "loading" | "qr" | "ready") || "disconnected";
        setWaStatus(s);
        setWaQr(r.qr || null);
      }
    });
    return () => { cancelled = true; };
  }, [maximized]);

  // When maximized, re-sync status after a short delay so we definitely have "ready" after session restore
  useEffect(() => {
    if (!maximized || !hasWhatsAppAPI()) return;
    const t = setTimeout(() => {
      window.electronAPI!.whatsapp!.getStatus().then((r) => {
        const s = (r.status as "disconnected" | "loading" | "qr" | "ready") || "disconnected";
        setWaStatus(s);
        setWaQr(r.qr || null);
      });
    }, 500);
    return () => clearTimeout(t);
  }, [maximized]);

  // "Taking a while?" after 25s in loading
  useEffect(() => {
    if (waStatus !== "loading") return;
    setLoadingSlow(false);
    const t = setTimeout(() => setLoadingSlow(true), 25000);
    return () => clearTimeout(t);
  }, [waStatus]);

  const startWhatsApp = useCallback(async () => {
    if (!hasWhatsAppAPI()) return;
    setWaError(null);
    setWaStatus("loading");
    const r = await window.electronAPI!.whatsapp!.init();
    setWaStatus((r.status as "disconnected" | "loading" | "qr" | "ready") || "disconnected");
    if (r.qr) setWaQr(r.qr);
  }, []);

  const retryWhatsApp = useCallback(async () => {
    if (!hasWhatsAppAPI()) return;
    setWaError(null);
    setLoadingSlow(false);
    await window.electronAPI!.whatsapp!.reset();
    setWaStatus("disconnected");
    setWaQr(null);
    startWhatsApp();
  }, [startWhatsApp]);

  const [waChatsError, setWaChatsError] = useState<string | null>(null);

  const loadChats = useCallback(async () => {
    if (!hasWhatsAppAPI() || waStatus !== "ready") return;
    setWaChatsError(null);
    setWaChatsLoading(true);
    try {
      const r = await window.electronAPI!.whatsapp!.getChats();
      if (r.ok && Array.isArray(r.chats)) {
        setWaChats(r.chats);
      } else if (!r.ok && (r as { error?: string }).error) {
        setWaChatsError((r as { error: string }).error);
        setWaChats([]);
      } else {
        setWaChats([]);
      }
    } catch (e) {
      setWaChatsError(e instanceof Error ? e.message : "Failed to load chats");
      setWaChats([]);
    } finally {
      setWaChatsLoading(false);
    }
  }, [waStatus]);

  useEffect(() => {
    if (waStatus === "ready") loadChats();
  }, [waStatus, loadChats]);

  const loadMessages = useCallback(async (chatId: string) => {
    if (!hasWhatsAppAPI()) return;
    setSelectedChatId(chatId);
    setWaMessagesLoading(true);
    const r = await window.electronAPI!.whatsapp!.getMessages(chatId, 50);
    if (r.ok && r.messages) setWaMessages(r.messages);
    setWaMessagesLoading(false);
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const phone = (fd.get("phone") as string).replace(/\D/g, "").trim();
    const label = (fd.get("label") as string).trim() || phone;
    if (!phone) return;
    await supabase.from("whatsapp_contacts").insert({
      user_id: user.id,
      label,
      phone,
    });
    setOpen(false);
    form.reset();
    notify("WhatsApp number added", label);
  }

  const contactRow = (c: WhatsAppContact) => (
    <button
      key={c.id}
      type="button"
      onClick={() => openExternal(toWhatsAppLink(c.phone))}
      className="flex items-center gap-3 py-2.5 px-3 rounded-lg bg-white/80 border border-green-200/60 hover:bg-green-50 hover:border-green-300 transition-colors w-full text-left"
    >
      <span className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white text-lg shrink-0">💬</span>
      <div className="min-w-0 flex-1">
        <span className="font-medium text-slate-800 block">{c.label}</span>
        <span className="text-xs text-slate-500 font-mono">{c.phone}</span>
      </div>
      <span className="text-green-600 text-sm shrink-0">Open →</span>
    </button>
  );

  const canUseInAppWhatsApp = isElectron && hasWhatsAppAPI();

  if (maximized) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <button type="button" onClick={onMinimize} className="rounded-lg border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50">← Minimize</button>
          <button type="button" onClick={() => openExternal(WHATSAPP_WEB_URL)} className="rounded-lg bg-green-500 text-white px-4 py-2 font-medium hover:bg-green-600">Open WhatsApp Web</button>
          <button type="button" onClick={() => setOpen(true)} className="rounded-lg bg-green-600 text-white px-4 py-2 font-medium hover:bg-green-700">+ Add number</button>
          {canUseInAppWhatsApp && (
            waStatus === "ready" ? (
              <button type="button" onClick={loadChats} className="rounded-lg border border-green-500 text-green-700 px-4 py-2 font-medium hover:bg-green-50" disabled={waChatsLoading}>Refresh chats</button>
            ) : (
              <button type="button" onClick={startWhatsApp} className="rounded-lg border border-green-600 text-green-700 px-4 py-2 font-medium hover:bg-green-50" disabled={waStatus === "loading"}>
                {waStatus === "loading" ? "Connecting…" : "Link WhatsApp (in-app)"}
              </button>
            )
          )}
        </div>

        {canUseInAppWhatsApp && (
          <div className="rounded-xl border border-green-200/80 bg-white/90 p-4 space-y-3">
            <h3 className="font-medium text-slate-800">WhatsApp chats (in-app)</h3>
            {waStatus === "disconnected" && (
              <div className="space-y-2">
                <p className="text-sm text-slate-600">Click &quot;Link WhatsApp (in-app)&quot; and scan the QR code with your phone to see chats here. Session is stored locally.</p>
                <p className="text-xs text-slate-500 bg-slate-100 rounded-lg px-3 py-2">On office or campus WiFi? Many networks block WhatsApp Web. Use mobile hotspot or home WiFi if the QR never appears.</p>
              </div>
            )}
            {waStatus === "loading" && (
              <div className="flex flex-col gap-2">
                <p className="text-sm text-slate-600">Opening WhatsApp Web… A small window may appear briefly; the QR will show here when ready.</p>
                {loadingSlow && (
                  <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
                    <p>Taking a while? <strong>Office or campus WiFi often blocks WhatsApp Web.</strong> Try mobile hotspot or home WiFi, then click Try again.</p>
                    <p className="mt-1 text-amber-700">Or check the small WhatsApp window if it opened—you can scan the QR there.</p>
                    <button type="button" onClick={retryWhatsApp} className="mt-2 rounded-lg bg-amber-600 text-white px-3 py-1.5 text-sm font-medium hover:bg-amber-700">Try again</button>
                  </div>
                )}
              </div>
            )}
            {waStatus === "qr" && waQr && (
              <div className="flex flex-col items-center gap-2">
                <p className="text-sm text-slate-600">Scan with WhatsApp on your phone: Settings → Linked devices → Link a device</p>
                <img src={waQr} alt="WhatsApp QR" className="rounded-lg border border-slate-200 bg-white p-2" width={280} height={280} />
              </div>
            )}
            {waError && (
              <div className="space-y-2">
                <p className="text-sm text-red-600 rounded-lg bg-red-50 border border-red-200 px-3 py-2">{waError}</p>
                <p className="text-xs text-slate-600 bg-slate-100 rounded-lg px-3 py-2">If you&apos;re on office WiFi, switch to mobile data or home network—many offices block WhatsApp Web. Then click Link WhatsApp again.</p>
              </div>
            )}
            {waStatus === "ready" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 mb-2">Recent chats</p>
                  {waChatsError && (
                    <p className="text-sm text-red-600 mb-2">{waChatsError}</p>
                  )}
                  {waChatsLoading ? (
                    <p className="text-sm text-slate-500">Loading…</p>
                  ) : waChats.length === 0 ? (
                    <p className="text-sm text-slate-500">{waChatsError ? "Could not load chats. Click Refresh chats to retry." : "No chats."}</p>
                  ) : (
                    <ul className="space-y-1 max-h-64 overflow-y-auto">
                      {waChats.map((c) => (
                        <li key={c.id}>
                          <button
                            type="button"
                            onClick={() => loadMessages(c.id)}
                            className={`w-full text-left py-2 px-3 rounded-lg text-sm ${selectedChatId === c.id ? "bg-green-100 border border-green-300" : "bg-slate-50 border border-transparent hover:bg-green-50"}`}
                          >
                            <span className="font-medium text-slate-800">{c.name}</span>
                            {c.unreadCount > 0 && <span className="ml-2 text-xs text-green-600">({c.unreadCount})</span>}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-2">Messages</p>
                  {!selectedChatId ? (
                    <p className="text-sm text-slate-500">Select a chat.</p>
                  ) : waMessagesLoading ? (
                    <p className="text-sm text-slate-500">Loading…</p>
                  ) : (
                    <ul className="space-y-2 max-h-64 overflow-y-auto">
                      {waMessages.map((m) => (
                        <li key={m.id} className={`text-sm ${m.fromMe ? "text-right" : "text-left"}`}>
                          <span className={`inline-block max-w-[85%] rounded-lg px-3 py-1.5 ${m.fromMe ? "bg-green-100 text-slate-800" : "bg-slate-100 text-slate-800"}`}>
                            {m.body || <em className="text-slate-500">[media]</em>}
                          </span>
                          <span className="block text-xs text-slate-400 mt-0.5">{new Date(m.timestamp * 1000).toLocaleString()}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
            <p className="text-xs text-amber-700/90">Unofficial integration. Use for personal reading only; avoid automation to reduce ban risk.</p>
          </div>
        )}

        <p className="text-sm text-slate-600">Click a number below to open in WhatsApp Web or app.</p>
        {loading ? <p className="text-slate-500">Loading…</p> : contacts.length === 0 ? <p className="text-slate-500">No numbers yet. Add yours (e.g. 6263859673) and others.</p> : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {contacts.map((c) => <li key={c.id}>{contactRow(c)}</li>)}
          </ul>
        )}
        <Modal open={open} onClose={() => setOpen(false)} title="Add WhatsApp number">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Label (e.g. My number, Mom)</label><input name="label" className="w-full rounded-lg border border-slate-300 px-3 py-2" placeholder="My number" /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Phone number</label><input name="phone" type="tel" required className="w-full rounded-lg border border-slate-300 px-3 py-2" placeholder="6263859673 or 916263859673" /><p className="text-xs text-slate-500 mt-1">Digits only. Clicking opens WhatsApp Web or app.</p></div>
            <div className="flex gap-2 pt-2"><button type="submit" className="rounded-lg bg-green-600 text-white px-4 py-2 font-medium hover:bg-green-700">Add</button><button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50">Cancel</button></div>
          </form>
        </Modal>
      </div>
    );
  }

  return (
    <>
      <WidgetWrapper
        title="WhatsApp"
        variant="cta"
        icon={<IconMessage />}
        onAddClick={() => setOpen(true)}
        onMaximize={onMaximize}
        addLabel="Add number"
      >
        {loading ? (
          <p className="text-sm text-green-700/60">Loading…</p>
        ) : contacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-4 text-center">
            <p className="text-sm text-slate-600 mb-2">Connect WhatsApp and add numbers.</p>
            <button type="button" onClick={() => openExternal(WHATSAPP_WEB_URL)} className="rounded-full bg-green-500 text-white px-4 py-2 text-sm font-medium hover:bg-green-600 mb-2">Connect WhatsApp</button>
            <button type="button" onClick={() => setOpen(true)} className="text-sm text-green-600 hover:underline">+ Add number</button>
          </div>
        ) : (
          <>
            <button type="button" onClick={() => openExternal(WHATSAPP_WEB_URL)} className="text-xs text-green-600 hover:underline mb-2">Open WhatsApp Web</button>
            <ul className="space-y-2">
              {contacts.slice(0, 3).map((c) => <li key={c.id}>{contactRow(c)}</li>)}
            </ul>
          </>
        )}
      </WidgetWrapper>
      <Modal open={open} onClose={() => setOpen(false)} title="Add WhatsApp number">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Label (e.g. My number, Mom)</label><input name="label" className="w-full rounded-lg border border-slate-300 px-3 py-2" placeholder="My number" /></div>
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Phone number</label><input name="phone" type="tel" required className="w-full rounded-lg border border-slate-300 px-3 py-2" placeholder="6263859673 or 916263859673" /><p className="text-xs text-slate-500 mt-1">Digits only. 10 digits = India (+91). Clicking opens WhatsApp Web or app.</p></div>
          <div className="flex gap-2 pt-2"><button type="submit" className="rounded-lg bg-green-600 text-white px-4 py-2 font-medium hover:bg-green-700">Add</button><button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50">Cancel</button></div>
        </form>
      </Modal>
    </>
  );
}
