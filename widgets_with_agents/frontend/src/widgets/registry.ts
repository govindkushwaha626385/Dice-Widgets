/**
 * Widget registry: list of widget IDs and helpers for URLs / maximize behavior.
 * Used by MyWidgets to render the correct widget and open it in a new window.
 */

import { openInWindow } from "../lib/electronApi";

export type WidgetId =
  | "expenses"
  | "notes"
  | "trips"
  | "shortcuts"
  | "custom-fields"
  | "products"
  | "prs"
  | "vouchers"
  | "emails"
  | "whatsapp"
  | "calendar"
  | "tasks"
  | "analysis";

/** All widget IDs in display order. */
export const WIDGET_IDS: WidgetId[] = [
  "expenses",
  "notes",
  "trips",
  "shortcuts",
  "custom-fields",
  "products",
  "prs",
  "vouchers",
  "emails",
  "whatsapp",
  "calendar",
  "tasks",
  "analysis",
];

/** Build URL for opening a single widget in its own window (used by Electron). */
export function getWidgetWindowUrl(widgetId: string): string {
  if (typeof window === "undefined") return "";
  const origin = window.location.origin;
  const path = window.location.pathname;
  const isFile = origin.startsWith("file://");
  if (isFile) return `${origin}${path}#widget=${widgetId}`;
  const base =
    path === "/" || !path.includes("my-widgets")
      ? `${origin}/my-widgets`
      : `${origin}${path}`;
  return `${base}${base.includes("?") ? "&" : "?"}widget=${widgetId}`;
}

/** Return handler that opens the widget (or external site for Gmail/Calendar/Tasks) in a new window. */
export function getMaximizeHandler(widgetId: WidgetId): () => void {
  if (widgetId === "emails")
    return () => openInWindow("https://mail.google.com", "Gmail");
  if (widgetId === "calendar")
    return () => openInWindow("https://calendar.google.com", "Google Calendar");
  if (widgetId === "tasks")
    return () => openInWindow("https://tasks.google.com", "Google Tasks");
  const title = widgetId
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return () => openInWindow(getWidgetWindowUrl(widgetId), title);
}
