/** App shell: header with nav + sign out, or minimal shell when opened as single-widget window. */
import { type ReactNode } from "react";
import { Link, useLocation, Outlet, useSearchParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

interface LayoutProps {
  children?: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user, profile, signOut } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const widgetParam = searchParams.get("widget");
  const hashWidget = typeof window !== "undefined" && window.location.hash.match(/widget=([^&]+)/);
  const isWidgetOnly = !!(widgetParam || hashWidget);

  if (isWidgetOnly) {
    return (
      <div className="min-h-screen flex flex-col relative">
        <main className="flex-1 w-full px-3 py-3 relative z-10">
          {children ?? <Outlet />}
        </main>
      </div>
    );
  }

  const isDashboard = location.pathname === "/my-widgets";

  return (
    <div className="min-h-screen flex flex-col relative">
      <header className="sticky top-0 z-20 backdrop-blur-xl bg-white/80 border-b border-slate-200/90 shadow-sm shrink-0">
        <div className={`mx-auto px-3 sm:px-4 h-11 flex items-center justify-between ${isDashboard ? "max-w-full" : "max-w-6xl"}`}>
          <nav className="flex items-center gap-6">
            <Link
              to="/my-widgets"
              className={`font-medium text-sm transition-colors ${
                location.pathname === "/my-widgets"
                  ? "text-indigo-600"
                  : "text-slate-600 hover:text-indigo-600"
              }`}
            >
              My Widgets
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            {profile?.uid && (
              <span className="text-xs text-slate-500 font-mono bg-slate-100/80 px-2 py-0.5 rounded">{profile.uid}</span>
            )}
            <span className="text-xs text-slate-600 truncate max-w-[180px]" title={user?.email}>
              {user?.email}
            </span>
            <button
              type="button"
              onClick={() => signOut()}
              className="text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className={`flex-1 relative z-10 ${isDashboard ? "flex flex-col min-h-0 overflow-hidden" : "max-w-6xl w-full mx-auto px-3 sm:px-4 py-4 sm:py-5"}`}>
        {isDashboard ? (
          <div className="flex-1 min-h-0 overflow-hidden">
            {children ?? <Outlet />}
          </div>
        ) : (
          children ?? <Outlet />
        )}
      </main>
    </div>
  );
}
