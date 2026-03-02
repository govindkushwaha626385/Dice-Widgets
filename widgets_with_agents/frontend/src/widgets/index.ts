/**
 * Widgets: single entry point. Import widget components and registry from here.
 */
export { ExpenseWidget } from "./expenses";
export { NotesWidget } from "./notes";
export { TripsWidget } from "./trips";
export { ShortcutsWidget } from "./shortcuts";
export { CustomFieldsWidget } from "./custom-fields";
export { PRsWidget } from "./prs";
export { VouchersWidget } from "./vouchers";
export { EmailsWidget } from "./emails";
export { WhatsAppWidget } from "./whatsapp";
export { ChatbotWidget } from "./chatbot";
export { CalendarWidget } from "./calendar";
export { TasksWidget } from "./tasks";
export { AnalysisWidget } from "./analysis";

export type { WidgetId } from "./registry";
export { WIDGET_IDS, getWidgetWindowUrl, getMaximizeHandler } from "./registry";
