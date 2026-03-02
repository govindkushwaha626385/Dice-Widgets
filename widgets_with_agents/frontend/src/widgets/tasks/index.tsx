/** Tasks widget: Google Tasks preview. Uses backend Google API. */
import { useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useGoogleTasks } from "../../hooks/useGoogleTasks";
import { WidgetWrapper } from "../../components/WidgetWrapper";
import { getDisplayEmail } from "../../lib/integrations";
import { openExternal } from "../../lib/electronApi";

const placeholderTasks = [
  { id: "p1", title: "Review PR", due: "Today", completed: false },
  { id: "p2", title: "Send report", due: "Tomorrow", completed: false },
];

interface TasksWidgetProps {
  maximized?: boolean;
  onMinimize?: () => void;
  onMaximize?: () => void;
}

export function TasksWidget({ maximized, onMinimize, onMaximize }: TasksWidgetProps) {
  const [retryKey, setRetryKey] = useState(0);
  const { user, profile } = useAuth();
  const { tasks: apiTasks, loading, error } = useGoogleTasks(retryKey);
  const email = getDisplayEmail(user?.email ?? profile?.email ?? undefined);
  const connectUrl = "https://tasks.google.com";

  const connected = !loading && !error;
  const useReal = connected;
  const taskList = useReal ? apiTasks : placeholderTasks;
  const showList = maximized ? taskList : taskList.slice(0, 3);
  const emptyTasks = useReal && apiTasks.length === 0;

  const content = (
    <>
      <p className="text-xs text-violet-600/80 mb-2">Account: <strong>{email}</strong></p>
      {error && (
        <div
          role="button"
          tabIndex={0}
          onClick={() => setRetryKey((k) => k + 1)}
          onKeyDown={(e) => e.key === "Enter" && setRetryKey((k) => k + 1)}
          className="text-sm text-amber-700 mb-2 font-medium cursor-pointer select-none rounded p-2 -m-2 hover:bg-amber-50/80"
        >
          Tasks: {error} — <span className="text-blue-600 underline font-medium">Retry</span>
        </div>
      )}
      {!useReal && !loading && !error && <p className="text-sm text-slate-600 mb-2">Use same backend/.env credentials; enable Tasks API and add tasks scope (see backend/GOOGLE_API_SETUP.md).</p>}
      {loading && showList.length === 0 ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : emptyTasks ? (
        <p className="text-sm text-slate-500">No tasks in your lists.</p>
      ) : (
        <ul className="space-y-2">
          {showList.map((t) => (
            <li key={t.id} className="flex items-center gap-3 py-2 px-3 rounded-lg bg-white border border-slate-200">
              <input type="checkbox" defaultChecked={t.completed} className="rounded" readOnly />
              <span className="flex-1 font-medium truncate">{t.title}</span>
              <span className="text-xs text-slate-500 shrink-0">{t.due}</span>
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
          <button type="button" onClick={() => openExternal(connectUrl)} className="rounded-lg bg-violet-600 text-white px-4 py-2 font-medium hover:bg-violet-700">Open Google Tasks</button>
        </div>
        {content}
      </div>
    );
  }

  return (
    <WidgetWrapper title="Tasks" variant="workflow" onAddClick={() => openExternal(connectUrl)} onMaximize={onMaximize} addLabel="Open Tasks">
      {content}
    </WidgetWrapper>
  );
}
