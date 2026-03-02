/**
 * Shown once when the app is opened in Electron and Dice dashboard auth is not yet saved.
 * User signs in via an in-app window; session is stored and reused for expenses and other Dice features.
 */
import { useState, useEffect } from "react";
import { isElectron, getDiceAuthAPI, openExternal } from "../lib/electronApi";

const DICE_LOGIN_URL = "https://corporate.dice.tech/app/transaction";

export function DiceLoginRequired() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isElectron || !window.electronAPI?.diceAuth) return;
    const api = getDiceAuthAPI();
    const unsubError = api?.onError?.(setError);
    const unsubOpened = api?.onWindowOpened?.(() => setLoading(false));
    return () => {
      unsubError?.();
      unsubOpened?.();
    };
  }, []);

  async function handleOpenLogin() {
    setError(null);
    setLoading(true);
    try {
      if (!window.electronAPI?.diceAuth?.openLogin) {
        setError("Dice login is not available in this environment. Run the app from Electron.");
        return;
      }
      await window.electronAPI.diceAuth.openLogin();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to open login window");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4 relative">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/80 via-white to-amber-50/60 pointer-events-none" />
      <div className="relative w-full max-w-md rounded-2xl bg-white/95 shadow-xl border border-slate-200/90 p-8 text-center">
        <div className="w-14 h-14 rounded-xl bg-indigo-100 flex items-center justify-center mx-auto mb-5 text-indigo-600 text-2xl">
          🔐
        </div>
        <h1 className="text-xl font-semibold text-slate-800 mb-2">
          Sign in to Dice once
        </h1>
        <p className="text-slate-600 text-sm mb-6 leading-relaxed">
          To use Expenses and other Dice features in this app, sign in to the Dice dashboard
          in the window that opens. Your session is stored securely on this device and
          won’t be asked again.
        </p>
        {error && (
          <div className="rounded-lg bg-red-50 text-red-700 text-sm px-4 py-2 mb-4 text-left">
            {error}
          </div>
        )}
        <button
          type="button"
          onClick={handleOpenLogin}
          disabled={loading}
          className="w-full rounded-xl bg-indigo-600 text-white font-medium py-3 px-4 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Opening…" : "Open Dice login (in app)"}
        </button>
        <p className="text-slate-400 text-xs mt-4">
          After you sign in and see the Dice dashboard in the app window, it will close and this app will continue.
        </p>
        <button
          type="button"
          onClick={() => openExternal(DICE_LOGIN_URL)}
          className="mt-3 text-sm text-indigo-600 hover:text-indigo-700 underline"
        >
          Open Dice in browser instead
        </button>
        <p className="text-slate-400 text-xs mt-2">
          If the in-app window didn’t appear, use the link above to sign in in your browser. To save your session in this app, use “Open Dice login (in app)” again after restarting the app.
        </p>
      </div>
    </div>
  );
}
