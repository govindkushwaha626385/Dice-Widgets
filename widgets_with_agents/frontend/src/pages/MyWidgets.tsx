/** My Widgets: dashboard grid with variable widget sizes. Chatbot as floating bottom-right icon. */
import { useSearchParams } from "react-router-dom";
import { useMemo } from "react";
import {
  ExpenseWidget,
  NotesWidget,
  TripsWidget,
  ShortcutsWidget,
  PRsWidget,
  VouchersWidget,
  VendorAdvanceWidget,
  EmployeeSettlementsWidget,
  VendorSettlementsWidget,
  TransfersAccountsWidget,
  EmailsWidget,
  WhatsAppWidget,
  CalendarWidget,
  TasksWidget,
  AnalysisWidget,
  type WidgetId,
  WIDGET_IDS,
  getMaximizeHandler,
} from "../widgets";
import { closeWindow } from "../lib/electronApi";
import { IconWallet } from "../components/WidgetIcons";
import { FloatingChat } from "../components/FloatingChat";

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
      <div className="h-screen flex flex-col bg-slate-50/95">
        <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200/80 bg-white/90 shrink-0">
          <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
          <button type="button" onClick={closeWindow} className="rounded-md border border-slate-300 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50">Close</button>
        </div>
        <div className="flex-1 min-h-0 overflow-auto p-2">
          {singleWidgetId === "expenses" && <ExpenseWidget maximized onMinimize={closeWindow} />}
          {singleWidgetId === "notes" && <NotesWidget maximized onMinimize={closeWindow} />}
          {singleWidgetId === "trips" && <TripsWidget maximized onMinimize={closeWindow} />}
          {singleWidgetId === "shortcuts" && <ShortcutsWidget maximized onMinimize={closeWindow} />}
          {singleWidgetId === "prs" && <PRsWidget maximized onMinimize={closeWindow} />}
          {singleWidgetId === "vouchers" && <VouchersWidget maximized onMinimize={closeWindow} />}
          {singleWidgetId === "vendor-advance" && <VendorAdvanceWidget maximized onMinimize={closeWindow} />}
          {singleWidgetId === "employee-settlements" && <EmployeeSettlementsWidget maximized onMinimize={closeWindow} />}
          {singleWidgetId === "vendor-settlements" && <VendorSettlementsWidget maximized onMinimize={closeWindow} />}
          {singleWidgetId === "transfers-accounts" && <TransfersAccountsWidget maximized onMinimize={closeWindow} />}
          {singleWidgetId === "emails" && <EmailsWidget maximized onMinimize={closeWindow} />}
          {singleWidgetId === "whatsapp" && <WhatsAppWidget maximized onMinimize={closeWindow} />}
          {singleWidgetId === "calendar" && <CalendarWidget maximized onMinimize={closeWindow} />}
          {singleWidgetId === "tasks" && <TasksWidget maximized onMinimize={closeWindow} />}
          {singleWidgetId === "analysis" && <AnalysisWidget maximized />}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col min-h-0 overflow-hidden">
      <header className="shrink-0 px-3 py-2 border-b border-slate-200/80 bg-white/80 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-indigo-600"><IconWallet /></span>
            <h1 className="text-lg font-bold text-slate-800 tracking-tight">My Widgets</h1>
          </div>
          <p className="text-xs text-slate-500 hidden sm:block">Personal assistant dashboard</p>
        </div>
      </header>

      <div className="flex-1 min-h-0 p-2 sm:p-3 overflow-auto flex flex-col">
        {/* Full width: 2 cols small, 3 cols medium, 4 cols large */}
        <div
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 w-full"
          style={{ gridAutoRows: "minmax(160px, auto)" }}
        >
          {/* Row 1 */}
          <div className="min-h-[160px] overflow-hidden flex flex-col md:min-h-[180px]">
            <ExpenseWidget onMaximize={getMaximizeHandler("expenses")} />
          </div>
          <div className="min-h-[160px] overflow-hidden flex flex-col md:min-h-[180px]">
            <NotesWidget onMaximize={getMaximizeHandler("notes")} />
          </div>
          <div className="min-h-[160px] overflow-hidden flex flex-col md:min-h-[180px]">
            <VouchersWidget onMaximize={getMaximizeHandler("vouchers")} />
          </div>
          <div className="min-h-[160px] overflow-hidden flex flex-col md:min-h-[180px]">
            <VendorAdvanceWidget onMaximize={getMaximizeHandler("vendor-advance")} />
          </div>
          {/* Row 2 */}
          <div className="min-h-[160px] overflow-hidden flex flex-col md:min-h-[180px]">
            <EmployeeSettlementsWidget onMaximize={getMaximizeHandler("employee-settlements")} />
          </div>
          <div className="min-h-[160px] overflow-hidden flex flex-col md:min-h-[180px]">
            <VendorSettlementsWidget onMaximize={getMaximizeHandler("vendor-settlements")} />
          </div>
          <div className="min-h-[160px] overflow-hidden flex flex-col md:min-h-[180px]">
            <TransfersAccountsWidget onMaximize={getMaximizeHandler("transfers-accounts")} />
          </div>
          <div className="min-h-[160px] overflow-hidden flex flex-col md:min-h-[180px]">
            <ShortcutsWidget onMaximize={getMaximizeHandler("shortcuts")} />
          </div>
          <div className="min-h-[160px] overflow-hidden flex flex-col md:min-h-[180px]">
            <TripsWidget onMaximize={getMaximizeHandler("trips")} />
          </div>
          {/* Row 3 */}
          <div className="min-h-[160px] overflow-hidden flex flex-col md:min-h-[180px]">
            <PRsWidget onMaximize={getMaximizeHandler("prs")} />
          </div>
          <div className="min-h-[160px] overflow-hidden flex flex-col md:min-h-[180px]">
            <EmailsWidget onMaximize={getMaximizeHandler("emails")} />
          </div>
          <div className="min-h-[160px] overflow-hidden flex flex-col md:min-h-[180px]">
            <WhatsAppWidget onMaximize={getMaximizeHandler("whatsapp")} />
          </div>
          {/* Row 4 */}
          <div className="min-h-[160px] overflow-hidden flex flex-col md:min-h-[180px]">
            <CalendarWidget onMaximize={getMaximizeHandler("calendar")} />
          </div>
          <div className="min-h-[160px] overflow-hidden flex flex-col md:min-h-[180px]">
            <TasksWidget onMaximize={getMaximizeHandler("tasks")} />
          </div>
          {/* Analysis: spans 2 columns so charts are visible */}
          <div className="min-h-[320px] overflow-hidden flex flex-col col-span-2 md:min-h-[360px]">
            <AnalysisWidget onMaximize={getMaximizeHandler("analysis")} />
          </div>
        </div>
      </div>

      <FloatingChat />
    </div>
  );
}
