/** My Widgets page: dashboard grid of all widgets, or single-widget view when opened in own window. */
import { useSearchParams } from "react-router-dom";
import { useMemo } from "react";
import {
  ExpenseWidget,
  NotesWidget,
  TripsWidget,
  ShortcutsWidget,
  CustomFieldsWidget,
  PRsWidget,
  VouchersWidget,
  EmailsWidget,
  WhatsAppWidget,
  ChatbotWidget,
  CalendarWidget,
  TasksWidget,
  AnalysisWidget,
  type WidgetId,
  WIDGET_IDS,
  getMaximizeHandler,
} from "../widgets";
import { closeWindow } from "../lib/electronApi";

export type { WidgetId };

export function MyWidgets() {
  const [searchParams] = useSearchParams();
  const widgetFromQuery = searchParams.get("widget");
  const widgetFromHash = useMemo(() => {
    if (typeof window === "undefined") return null;
    const m = window.location.hash.match(/widget=([^&]+)/);
    return m ? m[1] : null;
  }, []);
  const singleWidgetId = (widgetFromQuery || widgetFromHash) as WidgetId | null;

  if (singleWidgetId && WIDGET_IDS.includes(singleWidgetId)) {
    const title = singleWidgetId.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-800">{title}</h2>
          <button type="button" onClick={closeWindow} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">Close window</button>
        </div>
        {singleWidgetId === "expenses" && <ExpenseWidget maximized onMinimize={closeWindow} />}
        {singleWidgetId === "notes" && <NotesWidget maximized onMinimize={closeWindow} />}
        {singleWidgetId === "trips" && <TripsWidget maximized onMinimize={closeWindow} />}
        {singleWidgetId === "shortcuts" && <ShortcutsWidget maximized onMinimize={closeWindow} />}
        {singleWidgetId === "custom-fields" && <CustomFieldsWidget maximized onMinimize={closeWindow} />}
        {singleWidgetId === "prs" && <PRsWidget maximized onMinimize={closeWindow} />}
        {singleWidgetId === "vouchers" && <VouchersWidget maximized onMinimize={closeWindow} />}
        {singleWidgetId === "emails" && <EmailsWidget maximized onMinimize={closeWindow} />}
        {singleWidgetId === "whatsapp" && <WhatsAppWidget maximized onMinimize={closeWindow} />}
        {singleWidgetId === "calendar" && <CalendarWidget maximized onMinimize={closeWindow} />}
        {singleWidgetId === "tasks" && <TasksWidget maximized onMinimize={closeWindow} />}
        {singleWidgetId === "analysis" && <AnalysisWidget />}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center md:text-left">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 via-indigo-800 to-slate-800 bg-clip-text text-transparent tracking-tight">
          My Widgets
        </h1>
        <p className="text-slate-500 text-sm mt-1">Your personal assistant dashboard</p>
      </div>

      <section className="rounded-2xl p-4 bg-gradient-to-br from-amber-50/70 to-orange-50/50 border border-amber-200/60">
        <h2 className="text-sm font-bold text-amber-800 uppercase tracking-wider mb-3 flex items-center gap-2">
          <span className="w-1.5 h-5 rounded-full bg-amber-500" /> Spend & notes
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <ExpenseWidget onMaximize={getMaximizeHandler("expenses")} />
          <NotesWidget onMaximize={getMaximizeHandler("notes")} />
          <VouchersWidget onMaximize={getMaximizeHandler("vouchers")} />
          <ShortcutsWidget onMaximize={getMaximizeHandler("shortcuts")} />
        </div>
      </section>

      <section className="rounded-2xl p-4 bg-gradient-to-br from-teal-50/70 to-emerald-50/50 border border-teal-200/60">
        <h2 className="text-sm font-bold text-teal-800 uppercase tracking-wider mb-3 flex items-center gap-2">
          <span className="w-1.5 h-5 rounded-full bg-teal-500" /> Travel & work
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <TripsWidget onMaximize={getMaximizeHandler("trips")} />
          <PRsWidget onMaximize={getMaximizeHandler("prs")} />
        </div>
      </section>

      <section className="rounded-2xl p-4 bg-gradient-to-br from-blue-50/70 to-indigo-50/50 border border-blue-200/60">
        <h2 className="text-sm font-bold text-blue-800 uppercase tracking-wider mb-3 flex items-center gap-2">
          <span className="w-1.5 h-5 rounded-full bg-blue-500" /> Communicate
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          <EmailsWidget onMaximize={getMaximizeHandler("emails")} />
          <WhatsAppWidget onMaximize={getMaximizeHandler("whatsapp")} />
          <div className="sm:col-span-2">
            <ChatbotWidget />
          </div>
        </div>
      </section>

      <section className="rounded-2xl p-4 bg-gradient-to-br from-violet-50/70 to-purple-50/50 border border-violet-200/60">
        <h2 className="text-sm font-bold text-violet-800 uppercase tracking-wider mb-3 flex items-center gap-2">
          <span className="w-1.5 h-5 rounded-full bg-violet-500" /> Tools
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <CustomFieldsWidget onMaximize={getMaximizeHandler("custom-fields")} />
          <CalendarWidget onMaximize={getMaximizeHandler("calendar")} />
          <TasksWidget onMaximize={getMaximizeHandler("tasks")} />
        </div>
      </section>

      <section className="rounded-2xl p-4 bg-gradient-to-br from-fuchsia-50/70 to-pink-50/50 border border-fuchsia-200/60">
        <h2 className="text-sm font-bold text-fuchsia-800 uppercase tracking-wider mb-3 flex items-center gap-2">
          <span className="w-1.5 h-5 rounded-full bg-fuchsia-500" /> Insights
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <AnalysisWidget />
        </div>
      </section>
    </div>
  );
}
