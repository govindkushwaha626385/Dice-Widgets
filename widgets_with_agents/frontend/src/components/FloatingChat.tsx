/**
 * Floating chat: bottom-right icon button that opens the chatbot as a slide-up panel.
 */
import { useState } from "react";
import { ChatbotWidget } from "../widgets/chatbot";
import { IconMessage } from "./WidgetIcons";

const PANEL_HEIGHT = "min(85vh, 520px)";

export function FloatingChat() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-4 right-4 z-50 flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-slate-800 text-white shadow-lg shadow-slate-900/30 ring-2 ring-emerald-500/50 hover:bg-slate-700 hover:ring-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
        title="Open chat"
        aria-label="Open chat"
      >
        <IconMessage />
      </button>

      {open && (
        <div
          className="fixed bottom-0 right-0 left-0 z-40 flex flex-col rounded-t-2xl border-t border-slate-200 bg-white shadow-2xl sm:left-auto sm:right-4 sm:bottom-4 sm:w-[380px] sm:max-h-[80vh] sm:rounded-2xl sm:border sm:shadow-[0_8px_30px_rgba(0,0,0,0.12)]"
          style={{ height: typeof window !== "undefined" && window.innerWidth < 640 ? PANEL_HEIGHT : "80vh" }}
        >
            <div className="flex items-center justify-between shrink-0 border-b border-slate-200 bg-slate-50 px-3 py-2 rounded-t-2xl sm:rounded-t-2xl">
              <span className="font-semibold text-slate-800">Chat</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200 hover:text-slate-700"
                aria-label="Close chat"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
              <ChatbotWidget floating />
            </div>
          </div>
      )}
    </>
  );
}
