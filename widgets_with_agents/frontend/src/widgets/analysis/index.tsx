/** Analysis widget: Charts per widget (Expenses, Vouchers, Trips, PRs) + optional AI summary. */
import { useState } from "react";
import { WidgetWrapper } from "../../components/WidgetWrapper";
import { IconChart } from "../../components/WidgetIcons";
import { apiFetch } from "../../lib/electronApi";
import { useAuth } from "../../hooks/useAuth";
import { ThemeProvider, C1Component } from "@thesysai/genui-sdk";
import "@crayonai/react-ui/styles/index.css";
import { ChartsView } from "./ChartsView";

/** Extract C1 response string from OpenAI-style message content (string or array of parts). */
function extractC1Content(raw: unknown): string | null {
  if (raw == null) return null;
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw)) {
    for (const part of raw) {
      if (part && typeof part === "object" && "text" in part && typeof (part as { text: unknown }).text === "string") {
        return (part as { text: string }).text;
      }
    }
    return null;
  }
  if (typeof raw === "object" && "text" in raw && typeof (raw as { text: unknown }).text === "string") {
    return (raw as { text: string }).text;
  }
  return null;
}

type ViewMode = "charts" | "ai";

interface AnalysisWidgetProps {
  onMaximize?: () => void;
  /** When true, full-size charts (e.g. in single-widget view). */
  maximized?: boolean;
}

export function AnalysisWidget({ onMaximize, maximized }: AnalysisWidgetProps = {}) {
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>("charts");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [c1Content, setC1Content] = useState<string | null>(null);

  async function loadAnalysis() {
    if (!user) {
      setError("Sign in to view analysis.");
      return;
    }
    setLoading(true);
    setError(null);
    setC1Content(null);
    try {
      const res = await apiFetch("/api/analysis", {
        method: "POST",
        body: JSON.stringify({ userId: user.id }),
      });
      const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: unknown } }>;
        error?: string;
      };
      if (!res.ok || data.error) {
        setError(data.error ?? "Analysis failed. Add THESYS_API_KEY to backend/.env");
        return;
      }
      const raw = data.choices?.[0]?.message?.content;
      const c1String = extractC1Content(raw);
      if (c1String != null && c1String.length > 0) {
        setC1Content(c1String);
      } else {
        setError("No analysis content returned.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load analysis");
    } finally {
      setLoading(false);
    }
  }

  return (
    <WidgetWrapper title="Analytics" variant="default" icon={<IconChart />} onMaximize={onMaximize} className="min-h-[280px]">
      <ThemeProvider>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1 border-b border-slate-200 pb-2">
            <button
              type="button"
              onClick={() => setViewMode("charts")}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                viewMode === "charts" ? "bg-slate-200 text-slate-800" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Charts
            </button>
            <button
              type="button"
              onClick={() => setViewMode("ai")}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                viewMode === "ai" ? "bg-slate-200 text-slate-800" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              AI summary
            </button>
          </div>

          {viewMode === "charts" && (
            <>
              {!user ? (
                <p className="text-sm text-slate-500">Sign in to view charts.</p>
              ) : (
                <div className="overflow-auto max-h-[480px] min-h-[180px]">
                  <ChartsView userId={user.id} compact={!maximized} />
                </div>
              )}
            </>
          )}

          {viewMode === "ai" && (
            <>
              {!c1Content && !loading && (
                <div className="space-y-2">
                  <p className="text-sm text-slate-600">
                    AI summary with cards, tables, and charts.
                  </p>
                  <button
                    type="button"
                    onClick={loadAnalysis}
                    className="rounded-lg bg-indigo-600 text-white px-4 py-2 text-sm font-medium hover:bg-indigo-700"
                  >
                    Run AI analysis
                  </button>
                </div>
              )}
              {error && <p className="text-sm text-red-600 rounded-lg bg-red-50 px-3 py-2">{error}</p>}
              {loading && (
                <div className="flex items-center gap-2 text-slate-500">
                  <span className="inline-block w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="inline-block w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="inline-block w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                  <span>Analyzing…</span>
                </div>
              )}
              {c1Content != null && c1Content.length > 0 && !loading && (
                <div className="rounded-lg border border-slate-200 bg-white/80 p-3 overflow-auto max-h-[520px] min-h-[200px]">
                  <C1Component c1Response={c1Content} isStreaming={false} />
                </div>
              )}
            </>
          )}
        </div>
      </ThemeProvider>
    </WidgetWrapper>
  );
}
