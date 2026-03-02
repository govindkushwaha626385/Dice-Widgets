import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../lib/electronApi";

export interface GoogleTask {
  id: string;
  title: string;
  due: string;
  completed: boolean;
  listId: string;
}

export function useGoogleTasks(retryTrigger?: number) {
  const [tasks, setTasks] = useState<GoogleTask[]>([]);
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
    apiFetch("/api/tasks/list")
      .then(async (res) => {
        const text = await res.text();
        try {
          return JSON.parse(text) as { tasks?: GoogleTask[]; error?: string };
        } catch {
          throw new Error(res.ok ? "Invalid response" : `Server error ${res.status}`);
        }
      })
      .then((data) => {
        if (cancelled) return;
        if (data.error) {
          setError(data.error);
          setTasks([]);
        } else {
          setTasks(data.tasks ?? []);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not fetch tasks");
          setTasks([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [trigger]);

  return { tasks, loading, error, refetch };
}
