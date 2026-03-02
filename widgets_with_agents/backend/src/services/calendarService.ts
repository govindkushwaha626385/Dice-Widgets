import { google } from "googleapis";
import { getOAuth2Client, isGoogleConfigured } from "./googleAuth.js";

const MAX_EVENTS = 20;

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end?: string;
  color?: string;
}

export async function fetchUpcomingEvents(): Promise<{ ok: boolean; events: CalendarEvent[]; error?: string }> {
  if (!isGoogleConfigured()) {
    return { ok: false, events: [], error: "Google credentials not configured in backend/.env" };
  }

  try {
    const auth = getOAuth2Client();
    const calendar = google.calendar({ version: "v3", auth });
    const now = new Date().toISOString();
    const weekLater = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const res = await calendar.events.list({
      calendarId: "primary",
      timeMin: now,
      timeMax: weekLater,
      maxResults: MAX_EVENTS,
      singleEvents: true,
      orderBy: "startTime",
    });

    const items = res.data.items ?? [];
    const events: CalendarEvent[] = items.map((ev) => {
      const start = ev.start?.dateTime ?? ev.start?.date ?? "";
      const end = ev.end?.dateTime ?? ev.end?.date;
      return {
        id: ev.id ?? "",
        title: ev.summary ?? "(No title)",
        start: formatEventTime(start),
        end: end ? formatEventTime(end) : undefined,
        color: ev.colorId ? getColorClass(ev.colorId) : "bg-blue-400",
      };
    });

    return { ok: true, events };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch Calendar";
    console.error("[Calendar]", message);
    return { ok: false, events: [], error: message };
  }
}

function formatEventTime(iso: string): string {
  try {
    const d = new Date(iso);
    if (iso.includes("T")) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return d.toLocaleDateString();
  } catch {
    return iso;
  }
}

function getColorClass(colorId: string): string {
  const map: Record<string, string> = {
    "1": "bg-blue-400",
    "2": "bg-green-400",
    "3": "bg-purple-400",
    "4": "bg-orange-400",
    "5": "bg-red-400",
    "6": "bg-yellow-400",
    "7": "bg-teal-400",
    "8": "bg-pink-400",
    "9": "bg-indigo-400",
    "10": "bg-gray-400",
  };
  return map[colorId] ?? "bg-blue-400";
}
