/** Emails widget: Gmail inbox preview. Uses backend Google API; placeholder if not configured. */
import { useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useGmailEmails } from "../../hooks/useGmailEmails";
import { WidgetWrapper } from "../../components/WidgetWrapper";
import { IconMail } from "../../components/WidgetIcons";
import { getDisplayEmail } from "../../lib/integrations";
import { openExternal } from "../../lib/electronApi";

const placeholderEmails = [
  { id: "p1", from: "team@company.com", subject: "Weekly sync reminder", snippet: "Hi, don't forget the 3pm call…", date: "10:30", unread: true },
  { id: "p2", from: "noreply@service.com", subject: "Your order has shipped", snippet: "Tracking number: #12345…", date: "Yesterday", unread: false },
];

interface EmailsWidgetProps {
  maximized?: boolean;
  onMinimize?: () => void;
  onMaximize?: () => void;
}

export function EmailsWidget({ maximized, onMinimize, onMaximize }: EmailsWidgetProps) {
  const [retryKey, setRetryKey] = useState(0);
  const { user, profile } = useAuth();
  const { emails: apiEmails, loading, error } = useGmailEmails(retryKey);
  const email = getDisplayEmail(user?.email ?? profile?.email ?? undefined);
  const connectGmailUrl = "https://accounts.google.com/AccountChooser?continue=https://mail.google.com";

  const connected = !loading && !error;
  const useReal = connected;
  const emailList = useReal ? apiEmails : placeholderEmails;
  const showList = maximized ? emailList : emailList.slice(0, 3);
  const emptyInbox = useReal && apiEmails.length === 0;

  const content = (
    <>
      <p className="text-xs text-blue-600/80 mb-2">{useReal ? "Connected:" : "Using:"} <strong>{email}</strong></p>
      {error && (
        <div
          role="button"
          tabIndex={0}
          onClick={() => setRetryKey((k) => k + 1)}
          onKeyDown={(e) => e.key === "Enter" && setRetryKey((k) => k + 1)}
          className="text-sm text-amber-700 mb-2 font-medium cursor-pointer select-none rounded p-2 -m-2 hover:bg-amber-50/80"
        >
          Gmail: {error} — <span className="text-blue-600 underline font-medium">Retry</span>
        </div>
      )}
      {!useReal && !loading && !error && <p className="text-sm text-slate-600 mb-2">Add Gmail credentials in backend/.env (see backend/GOOGLE_API_SETUP.md).</p>}
      {loading && showList.length === 0 ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : emptyInbox ? (
        <p className="text-sm text-slate-500">Inbox is empty.</p>
      ) : (
        <ul className="space-y-0 divide-y divide-blue-200/60">
          {showList.map((e) => (
            <li key={e.id} className="py-2.5 px-0 flex gap-3 items-start">
              <span className="w-8 h-8 rounded-full bg-blue-200/80 flex items-center justify-center text-blue-700 text-xs font-medium shrink-0">{(e.from || "?")[0].toUpperCase()}</span>
              <div className="min-w-0 flex-1">
                <span className={`text-sm block truncate ${e.unread ? "font-semibold text-slate-800" : "text-slate-600"}`}>{e.subject}</span>
                <span className="text-xs text-slate-500 truncate block">{e.snippet}</span>
              </div>
              <span className="text-xs text-slate-400 shrink-0">{e.date}</span>
            </li>
          ))}
        </ul>
      )}
    </>
  );

  if (maximized) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <button type="button" onClick={onMinimize} className="rounded-lg border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50">← Minimize</button>
          <button type="button" onClick={() => openExternal(connectGmailUrl)} className="rounded-lg bg-blue-600 text-white px-4 py-2 font-medium hover:bg-blue-700">Connect Gmail</button>
        </div>
        {content}
      </div>
    );
  }

  return (
    <WidgetWrapper title="Emails" variant="inbox" icon={<IconMail />} onMaximize={onMaximize}>
      {content}
    </WidgetWrapper>
  );
}
