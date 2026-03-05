/** Calendar widget: Google Calendar events preview. Uses backend Google API. */
import { useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useCalendarEvents } from "../../hooks/useCalendarEvents";
import { WidgetWrapper } from "../../components/WidgetWrapper";
import { IconCalendar } from "../../components/WidgetIcons";
import { getDisplayEmail } from "../../lib/integrations";
import { openExternal } from "../../lib/electronApi";

const placeholderEvents: { id: string; title: string; start: string; end?: string; color: string }[] = [
  { id: "p1", title: "Team standup", start: "10:00", color: "bg-orange-400" },
  { id: "p2", title: "Client call", start: "14:00", color: "bg-blue-400" },
];

interface CalendarWidgetProps {
  maximized?: boolean;
  onMinimize?: () => void;
  onMaximize?: () => void;
}

export function CalendarWidget({ maximized, onMinimize, onMaximize }: CalendarWidgetProps) {
  const [retryKey, setRetryKey] = useState(0);
  const { user, profile } = useAuth();
  const { events: apiEvents, loading, error } = useCalendarEvents(retryKey);
  const email = getDisplayEmail(user?.email ?? profile?.email ?? undefined);
  const calendarUrl = "https://calendar.google.com";

  const connected = !loading && !error;
  const useReal = connected;
  const eventList = useReal ? apiEvents : placeholderEvents;
  const showList = maximized ? eventList : eventList.slice(0, 3);
  const emptyEvents = useReal && apiEvents.length === 0;

  const content = (
    <>
      <p className="text-xs text-orange-600/80 mb-2">{useReal ? "Connected:" : "Using:"} <strong>{email}</strong></p>
      {error && (
        <div
          role="button"
          tabIndex={0}
          onClick={() => setRetryKey((k) => k + 1)}
          onKeyDown={(e) => e.key === "Enter" && setRetryKey((k) => k + 1)}
          className="text-sm text-amber-700 mb-2 font-medium cursor-pointer select-none rounded p-2 -m-2 hover:bg-amber-50/80"
        >
          Calendar: {error} — <span className="text-blue-600 underline font-medium">Retry</span>
        </div>
      )}
      {!useReal && !loading && !error && <p className="text-sm text-slate-600 mb-2">Add Google credentials in backend/.env (see backend/GOOGLE_API_SETUP.md).</p>}
      {loading && showList.length === 0 ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : emptyEvents ? (
        <p className="text-sm text-slate-500">No upcoming events this week.</p>
      ) : (
        <ul className="space-y-2">
          {showList.map((e) => (
            <li key={e.id} className="flex items-center gap-3 py-2 px-3 rounded-lg bg-white/80 border border-orange-200/60">
              <span className={`w-1 h-10 rounded-full ${e.color ?? "bg-blue-400"} shrink-0`} />
              <div className="min-w-0 flex-1">
                <span className="font-medium text-slate-800 block truncate">{e.title}</span>
                <span className="text-xs text-slate-500">{e.start}{e.end ? ` – ${e.end}` : ""}</span>
              </div>
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
          <button type="button" onClick={() => openExternal(calendarUrl)} className="rounded-lg bg-orange-600 text-white px-4 py-2 font-medium hover:bg-orange-700">Open Google Calendar</button>
        </div>
        {content}
      </div>
    );
  }

  return (
    <WidgetWrapper title="Calendar" variant="calendar" icon={<IconCalendar />} onMaximize={onMaximize}>
      {content}
    </WidgetWrapper>
  );
}
