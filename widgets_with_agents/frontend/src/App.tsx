/** Root app: router, protected routes, login/signup, and My Widgets dashboard. */
import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Layout } from "./components/Layout";
import { Login } from "./pages/Login";
import { SignUp } from "./pages/SignUp";
import { MyWidgets } from "./pages/MyWidgets";
import { DiceLoginRequired } from "./pages/DiceLoginRequired";
import { isElectron, getDiceAuthAPI } from "./lib/electronApi";

/** In Electron, gate the app until Dice auth is saved (one-time login). */
function DiceAuthGate({ children }: { children: React.ReactNode }) {
  const [hasDiceAuth, setHasDiceAuth] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isElectron || !window.electronAPI?.diceAuth) {
      setHasDiceAuth(true);
      return;
    }
    const api = getDiceAuthAPI();
    api?.getStatus().then((r) => setHasDiceAuth(r?.hasAuth ?? false));

    const unsub = api?.onSaved?.(() => {
      setHasDiceAuth(true);
    });
    return () => unsub?.();
  }, []);

  if (!isElectron) return <>{children}</>;
  if (hasDiceAuth === null) return null; // brief loading
  if (!hasDiceAuth) return <DiceLoginRequired />;
  return <>{children}</>;
}

function App() {
  const isWidgetWindow =
    typeof window !== "undefined" && /widget=/.test(window.location.hash);

  return (
    <BrowserRouter>
      <DiceAuthGate>
        {isWidgetWindow ? (
          <ProtectedRoute>
            <Layout>
              <MyWidgets />
            </Layout>
          </ProtectedRoute>
        ) : (
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<SignUp />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/my-widgets" replace />} />
              <Route path="my-widgets" element={<MyWidgets />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        )}
      </DiceAuthGate>
    </BrowserRouter>
  );
}

export default App;
