import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../lib/electronApi";

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end?: string;
  color?: string;
}

export function useCalendarEvents(retryTrigger?: number) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);

  const refetch = useCallback(() => {
    setRefresh((n) => n + 1);
  }, []);

  const trigger = retryTrigger ?? refresh;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    apiFetch("/api/calendar/events")
      .then(async (res) => {
        const text = await res.text();
        try {
          return JSON.parse(text) as { events?: CalendarEvent[]; error?: string };
        } catch {
          throw new Error(res.ok ? "Invalid response" : `Server error ${res.status}`);
        }
      })
      .then((data) => {
        if (cancelled) return;
        if (data.error) {
          setError(data.error);
          setEvents([]);
        } else {
          setEvents(data.events ?? []);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not fetch events");
          setEvents([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [trigger]);

  return { events, loading, error, refetch };
}
