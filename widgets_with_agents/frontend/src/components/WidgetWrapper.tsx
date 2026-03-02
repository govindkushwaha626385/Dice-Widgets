/** Shared card shell for all widgets: title, variant styling, add/maximize buttons. */
import { type ReactNode } from "react";

const variants = {
  default:
    "border-slate-200/90 bg-white/90 backdrop-blur-sm shadow-lg shadow-slate-200/50 [--wh:theme(colors.slate.100)]",
  receipt:
    "border-amber-200/80 bg-gradient-to-b from-amber-50/90 to-white/90 backdrop-blur-sm shadow-lg shadow-amber-900/5 [--wh:theme(colors.amber.100)]",
  sticky:
    "border-yellow-200/80 bg-[#fefce8]/95 backdrop-blur-sm shadow-lg shadow-yellow-900/5 [--wh:theme(colors.yellow.200)]",
  journey:
    "border-indigo-200/80 bg-gradient-to-br from-indigo-50/80 to-white/90 backdrop-blur-sm shadow-lg shadow-indigo-900/5 [--wh:theme(colors.indigo.100)]",
  tiles:
    "border-emerald-200/80 bg-gradient-to-b from-emerald-50/60 to-white/90 backdrop-blur-sm shadow-lg shadow-emerald-900/5 [--wh:theme(colors.emerald.100)]",
  formBuilder:
    "border-slate-200/90 bg-slate-50/90 backdrop-blur-sm shadow-lg shadow-slate-200/50 [--wh:theme(colors.slate.200)]",
  inventory:
    "border-sky-200/80 bg-gradient-to-b from-sky-50/60 to-white/90 backdrop-blur-sm shadow-lg shadow-sky-900/5 [--wh:theme(colors.sky.100)]",
  workflow:
    "border-violet-200/80 bg-gradient-to-b from-violet-50/60 to-white/90 backdrop-blur-sm shadow-lg shadow-violet-900/5 [--wh:theme(colors.violet.100)]",
  ticket:
    "border-rose-200/80 bg-gradient-to-b from-rose-50/60 to-white/90 backdrop-blur-sm shadow-lg shadow-rose-900/5 border-l-4 border-l-rose-400 [--wh:theme(colors.rose.100)]",
  inbox:
    "border-blue-200/80 bg-gradient-to-b from-blue-50/60 to-white/90 backdrop-blur-sm shadow-lg shadow-blue-900/5 [--wh:theme(colors.blue.100)]",
  chat:
    "border-slate-700/80 bg-slate-900/95 backdrop-blur-sm shadow-xl shadow-slate-900/20 [--wh:theme(colors.slate.700)]",
  cta:
    "border-green-200/80 bg-gradient-to-b from-green-50/80 to-emerald-50/80 backdrop-blur-sm shadow-lg shadow-emerald-900/5 [--wh:theme(colors.green.200)]",
  calendar:
    "border-orange-200/80 bg-gradient-to-b from-orange-50/60 to-white/90 backdrop-blur-sm shadow-lg shadow-orange-900/5 [--wh:theme(colors.orange.100)]",
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
      className={`rounded-xl border overflow-hidden flex flex-col h-full ${minHeight ? "min-h-[140px]" : "min-h-0"} ${variants[variant]} ${className}`}
    >
      <div
        className={`flex items-center justify-between px-3 py-2 border-b border-[var(--wh)] shrink-0 ${isDark ? "bg-slate-800/80 border-slate-600" : ""}`}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          {icon && (
            <span className={`shrink-0 ${isDark ? "text-emerald-400" : "text-slate-500"}`}>
              {icon}
            </span>
          )}
          <h2
            className={`font-semibold text-sm truncate ${isDark ? "text-slate-100" : "text-slate-800"}`}
          >
            {title}
          </h2>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          {onMaximize != null && (
            <button
              type="button"
              onClick={onMaximize}
              className={`flex items-center justify-center w-7 h-7 rounded-md transition-colors ${
                isDark
                  ? "text-slate-400 hover:text-emerald-400 hover:bg-slate-700"
                  : "text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
              }`}
              title="Maximize"
              aria-label="Maximize"
            >
              <span className="text-base leading-none">⛶</span>
            </button>
          )}
          {onAddClick != null && (
            <button
              type="button"
              onClick={onAddClick}
              className={`flex items-center justify-center w-7 h-7 rounded-md transition-colors ${
                isDark
                  ? "text-slate-400 hover:text-emerald-400 hover:bg-slate-700"
                  : "text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
              }`}
              title={addLabel}
              aria-label={addLabel}
            >
              <span className="text-lg leading-none">+</span>
            </button>
          )}
        </div>
      </div>
      <div
        className={`flex-1 p-3 overflow-auto min-h-0 widget-content-dense ${isDark ? "bg-slate-900/50" : ""}`}
      >
        {children}
      </div>
    </div>
  );
}
