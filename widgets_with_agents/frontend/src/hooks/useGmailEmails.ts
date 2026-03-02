import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../lib/electronApi";

export interface GmailMessage {
  id: string;
  from: string;
  subject: string;
  snippet: string;
  date: string;
  unread: boolean;
}

export function useGmailEmails(retryTrigger?: number) {
  const [emails, setEmails] = useState<GmailMessage[]>([]);
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
    apiFetch("/api/gmail/emails")
      .then(async (res) => {
        const text = await res.text();
        try {
          return JSON.parse(text) as { emails?: GmailMessage[]; error?: string };
        } catch {
          throw new Error(res.ok ? "Invalid response" : `Server error ${res.status}`);
        }
      })
      .then((data) => {
        if (cancelled) return;
        if (data.error) {
          setError(data.error);
          setEmails([]);
        } else {
          setEmails(data.emails ?? []);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not fetch emails");
          setEmails([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [trigger]);

  return { emails, loading, error, refetch };
}
