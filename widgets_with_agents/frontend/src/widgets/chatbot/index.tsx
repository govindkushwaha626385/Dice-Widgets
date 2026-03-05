/** Chatbot widget: C1 Thesys chat with dynamic UI. Calls backend /api/chat/c1. */
import { useState, useRef, useEffect } from "react";
import { WidgetWrapper } from "../../components/WidgetWrapper";
import { apiFetch } from "../../lib/electronApi";
import { ThemeProvider, C1Component } from "@thesysai/genui-sdk";
import "@crayonai/react-ui/styles/index.css";

type Message =
  | { role: "user"; text: string }
  | { role: "assistant"; text?: string; c1Content?: unknown };

function buildMessagesForApi(messages: Message[]): { role: string; content: string }[] {
  return messages.map((m) => {
    if (m.role === "user") return { role: "user" as const, content: m.text };
    const content = m.text ?? (m.c1Content != null ? JSON.stringify(m.c1Content) : "");
    return { role: "assistant" as const, content };
  });
}

interface ChatbotWidgetProps {
  /** When true, render only chat content (no card wrapper); used in floating panel. */
  floating?: boolean;
}

export function ChatbotWidget({ floating }: ChatbotWidgetProps = {}) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text: "Hi! I'm your assistant. Ask me anything—I can show answers as cards, tables, and more. Add THESYS_API_KEY in backend/.env for dynamic UI.",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [useC1, setUseC1] = useState<boolean | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    const userMsg: Message = { role: "user", text };
    setMessages((m) => [...m, userMsg]);
    setLoading(true);

    const tryC1 = useC1 !== false;
    if (tryC1) {
      try {
        const res = await apiFetch("/api/chat/c1", {
          method: "POST",
          body: JSON.stringify({
            messages: buildMessagesForApi([...messages, userMsg]),
          }),
        });
        const data = (await res.json()) as {
          choices?: Array<{ message?: { role?: string; content?: unknown } }>;
          error?: string;
        };
        if (!res.ok || data.error) throw new Error(data.error ?? "C1 request failed");
        setUseC1(true);
        const choice = data.choices?.[0]?.message;
        const content = choice?.content;
        if (content != null && typeof content === "object" && !Array.isArray(content)) {
          setMessages((m) => [...m, { role: "assistant", c1Content: content }]);
        } else {
          const str = typeof content === "string" ? content : content != null ? String(content) : "No response.";
          setMessages((m) => [...m, { role: "assistant", text: str }]);
        }
        setLoading(false);
        return;
      } catch {
        setUseC1(false);
      }
    }

    try {
      const res = await apiFetch("/api/chat", {
        method: "POST",
        body: JSON.stringify({ message: text }),
      });
      const data = (await res.json()) as { reply?: string; error?: string };
      const reply = data.reply ?? data.error ?? "Sorry, I couldn't respond.";
      setMessages((m) => [...m, { role: "assistant", text: reply }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", text: "Something went wrong. Please try again." }]);
    } finally {
      setLoading(false);
    }
  }

  const content = (
    <ThemeProvider>
      <div className="flex flex-col h-full min-h-0">
        <div className="flex-1 min-h-0 overflow-auto space-y-4 mb-4 pr-1 px-2">
            {messages.map((msg, i) => (
              <div key={i} className={msg.role === "user" ? "flex justify-end" : "flex justify-start"}>
                {msg.role === "user" ? (
                  <div className="rounded-2xl rounded-tr-md px-4 py-2.5 text-sm max-w-[88%] shadow-md bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                    <span className="whitespace-pre-wrap break-words">{msg.text}</span>
                  </div>
                ) : "c1Content" in msg && msg.c1Content != null ? (
                  <div className="rounded-2xl rounded-tl-md bg-slate-800/90 border border-slate-600/50 p-3 text-left max-w-[95%] overflow-auto">
                    <C1Component c1Response={typeof msg.c1Content === "string" ? msg.c1Content : JSON.stringify(msg.c1Content)} />
                  </div>
                ) : (
                  <div className="rounded-2xl rounded-tl-md px-4 py-2.5 text-sm max-w-[88%] shadow-md bg-slate-700/90 text-slate-100 border border-slate-600/50">
                    <span className="whitespace-pre-wrap break-words">{msg.text ?? ""}</span>
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-tl-md bg-slate-700/90 px-4 py-2.5 text-sm text-slate-400 flex items-center gap-1.5">
                  <span className="inline-block w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="inline-block w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="inline-block w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Type a message…"
              className="flex-1 rounded-xl bg-slate-700/80 border border-slate-600/50 px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={loading}
              className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2.5 text-sm font-medium text-white hover:from-emerald-600 hover:to-teal-700 shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Send
            </button>
          </div>
        </div>
      </ThemeProvider>
  );

  if (floating) {
    return (
      <div className="flex flex-col h-full min-h-0 bg-slate-900/50 rounded-b-2xl overflow-hidden">
        {content}
      </div>
    );
  }

  return (
    <WidgetWrapper
      title="Chatbot"
      variant="chat"
      className="h-full min-h-0 shadow-xl shadow-slate-900/10"
    >
      {content}
    </WidgetWrapper>
  );
}
