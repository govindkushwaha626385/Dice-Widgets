/** Shared card shell for all widgets: title, variant styling, add/maximize buttons. */
import { type ReactNode } from "react";

const variants = {
  default:
    "border border-slate-200/90 bg-white backdrop-blur-sm shadow-md shadow-slate-200/60 hover:shadow-lg hover:shadow-slate-300/50 transition-shadow [--wh:theme(colors.slate.100)]",
  receipt:
    "border border-amber-200/90 bg-gradient-to-b from-amber-50/95 to-white backdrop-blur-sm shadow-md shadow-amber-900/10 hover:shadow-lg transition-shadow [--wh:theme(colors.amber.100)]",
  sticky:
    "border border-yellow-200/90 bg-[#fefce8]/95 backdrop-blur-sm shadow-md shadow-yellow-900/10 hover:shadow-lg transition-shadow [--wh:theme(colors.yellow.200)]",
  journey:
    "border border-indigo-200/90 bg-gradient-to-br from-indigo-50/80 to-white backdrop-blur-sm shadow-md shadow-indigo-900/10 hover:shadow-lg transition-shadow [--wh:theme(colors.indigo.100)]",
  tiles:
    "border border-emerald-200/90 bg-gradient-to-b from-emerald-50/70 to-white backdrop-blur-sm shadow-md shadow-emerald-900/10 hover:shadow-lg transition-shadow [--wh:theme(colors.emerald.100)]",
  formBuilder:
    "border border-slate-200/90 bg-slate-50/95 backdrop-blur-sm shadow-md shadow-slate-300/50 hover:shadow-lg transition-shadow [--wh:theme(colors.slate.200)]",
  inventory:
    "border border-sky-200/90 bg-gradient-to-b from-sky-50/70 to-white backdrop-blur-sm shadow-md shadow-sky-900/10 hover:shadow-lg transition-shadow [--wh:theme(colors.sky.100)]",
  workflow:
    "border border-violet-200/90 bg-gradient-to-b from-violet-50/70 to-white backdrop-blur-sm shadow-md shadow-violet-900/10 hover:shadow-lg transition-shadow [--wh:theme(colors.violet.100)]",
  ticket:
    "border border-rose-200/90 bg-gradient-to-b from-rose-50/70 to-white backdrop-blur-sm shadow-md shadow-rose-900/10 border-l-4 border-l-rose-400 hover:shadow-lg transition-shadow [--wh:theme(colors.rose.100)]",
  inbox:
    "border border-blue-200/90 bg-gradient-to-b from-blue-50/70 to-white backdrop-blur-sm shadow-md shadow-blue-900/10 hover:shadow-lg transition-shadow [--wh:theme(colors.blue.100)]",
  chat:
    "border border-slate-600/80 bg-slate-900/95 backdrop-blur-sm shadow-xl shadow-slate-900/30 [--wh:theme(colors.slate.700)]",
  cta:
    "border border-green-200/90 bg-gradient-to-b from-green-50/80 to-emerald-50/80 backdrop-blur-sm shadow-md shadow-emerald-900/10 hover:shadow-lg transition-shadow [--wh:theme(colors.green.200)]",
  calendar:
    "border border-orange-200/90 bg-gradient-to-b from-orange-50/70 to-white backdrop-blur-sm shadow-md shadow-orange-900/10 hover:shadow-lg transition-shadow [--wh:theme(colors.orange.100)]",
} as const;

export type WidgetVariant = keyof typeof variants;

interface WidgetWrapperProps {
  title: string;
  icon?: ReactNode;
  variant?: WidgetVariant;
  children: ReactNode;
  addLabel?: string;
  onAddClick?: () => void;
  onMaximize?: () => void;
  className?: string;
  /** Set to false to allow widget to shrink with content (no min height). */
  minHeight?: boolean;
}

export function WidgetWrapper({
  title,
  icon,
  variant = "default",
  children,
  addLabel = "Add",
  onAddClick,
  onMaximize,
  className = "",
  minHeight = true,
}: WidgetWrapperProps) {
  const isDark = variant === "chat";
  return (
    <div
      className={`rounded-xl overflow-hidden flex flex-col h-full ${minHeight ? "min-h-[140px]" : "min-h-0"} ${variants[variant]} ${className}`}
    >
      <div
        className={`flex items-center justify-between px-2.5 py-1.5 border-b border-[var(--wh)] shrink-0 ${isDark ? "bg-slate-800/80 border-slate-600" : ""}`}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          {icon && (
            <span className={`shrink-0 flex items-center ${isDark ? "text-emerald-400" : "text-slate-500"}`}>
              {icon}
            </span>
          )}
          <h2
            className={`font-semibold text-xs truncate ${isDark ? "text-slate-100" : "text-slate-800"}`}
          >
            {title}
          </h2>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          {onMaximize != null && (
            <button
              type="button"
              onClick={onMaximize}
              className={`flex items-center justify-center w-6 h-6 rounded transition-colors ${
                isDark
                  ? "text-slate-400 hover:text-emerald-400 hover:bg-slate-700"
                  : "text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
              }`}
              title="Maximize"
              aria-label="Maximize"
            >
              <span className="text-sm leading-none">⛶</span>
            </button>
          )}
          {onAddClick != null && (
            <button
              type="button"
              onClick={onAddClick}
              className={`flex items-center justify-center w-6 h-6 rounded transition-colors ${
                isDark
                  ? "text-slate-400 hover:text-emerald-400 hover:bg-slate-700"
                  : "text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
              }`}
              title={addLabel}
              aria-label={addLabel}
            >
              <span className="text-base leading-none">+</span>
            </button>
          )}
        </div>
      </div>
      <div
        className={`flex-1 p-2 overflow-auto min-h-0 widget-content-dense ${isDark ? "bg-slate-900/50" : ""}`}
      >
        {children}
      </div>
    </div>
  );
}
