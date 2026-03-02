import { google } from "googleapis";
import { getOAuth2Client, isGoogleConfigured } from "./googleAuth.js";

const MAX_TASKS = 50;

export interface GoogleTask {
  id: string;
  title: string;
  due: string;
  completed: boolean;
  listId: string;
}

export async function fetchTasks(): Promise<{ ok: boolean; tasks: GoogleTask[]; error?: string }> {
  if (!isGoogleConfigured()) {
    return { ok: false, tasks: [], error: "Google credentials not configured in backend/.env" };
  }

  try {
    const auth = getOAuth2Client();
    const tasksApi = google.tasks({ version: "v1", auth });

    const listsRes = await tasksApi.tasklists.list({ maxResults: 20 });
    const taskLists = listsRes.data.items ?? [];
    if (taskLists.length === 0) {
      return { ok: true, tasks: [] };
    }

    const allTasks: GoogleTask[] = [];

    for (const list of taskLists.slice(0, 5)) {
      const listId = list.id!;
      const tasksRes = await tasksApi.tasks.list({
        tasklist: listId,
        maxResults: MAX_TASKS,
        showCompleted: true,
        showHidden: false,
      });
      const items = tasksRes.data.items ?? [];
      for (const t of items) {
        if (!t.id || t.status === "completed") continue;
        allTasks.push({
          id: t.id,
          title: t.title ?? "(No title)",
          due: formatTaskDue(t.due ?? null),
          completed: t.status === "completed",
          listId,
        });
      }
    }

    allTasks.sort((a, b) => (a.due || "z").localeCompare(b.due || "z"));
    return { ok: true, tasks: allTasks.slice(0, MAX_TASKS) };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch Tasks";
    console.error("[Tasks]", message);
    return { ok: false, tasks: [], error: message };
  }
}

function formatTaskDue(due: string | null): string {
  if (!due) return "";
  try {
    const d = new Date(due);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const taskDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diff = (taskDay.getTime() - today.getTime()) / 86400000;
    if (diff < 0) return "Overdue";
    if (diff === 0) return "Today";
    if (diff === 1) return "Tomorrow";
    if (diff < 7) return d.toLocaleDateString(undefined, { weekday: "short" });
    return d.toLocaleDateString();
  } catch {
    return due;
  }
}
