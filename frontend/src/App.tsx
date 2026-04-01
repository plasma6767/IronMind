import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./screens/Login";
import Signup from "./screens/Signup";
import Onboarding from "./screens/Onboarding";
import Home from "./screens/Home";
import Settings from "./screens/Settings";

type AppState =
  | { phase: "loading" }
  | { phase: "auth" }
  | { phase: "onboarding"; athleteId: string }
  | { phase: "home"; athleteId: string };

export default function App() {
  const [appState, setAppState] = useState<AppState>({ phase: "loading" });

  useEffect(() => {
    const storedId = localStorage.getItem("athleteId");
    const storedToken = localStorage.getItem("token");

    if (!storedId || !storedToken) {
      setAppState({ phase: "auth" });
      return;
    }

    fetch(`/api/athlete/${encodeURIComponent(storedId)}`)
      .then((r) => r.json() as Promise<{ identity?: { name?: string } } | null>)
      .then((data) => {
        if (data?.identity?.name) {
          setAppState({ phase: "home", athleteId: storedId });
        } else {
          setAppState({ phase: "onboarding", athleteId: storedId });
        }
      })
      .catch(() => {
        setAppState({ phase: "auth" });
      });
  }, []);

  // Called by Login and Signup after credentials are verified.
  // Sets appState — route guards on /login and /signup redirect on next render.
  async function onAuth(athleteId: string) {
    try {
      const res = await fetch(`/api/athlete/${encodeURIComponent(athleteId)}`);
      const data = (await res.json()) as { identity?: { name?: string } } | null;
      if (data?.identity?.name) {
        setAppState({ phase: "home", athleteId });
      } else {
        setAppState({ phase: "onboarding", athleteId });
      }
    } catch {
      setAppState({ phase: "onboarding", athleteId });
    }
  }

  if (appState.phase === "loading") return null;

  // Route guard helpers — derived once so JSX stays readable
  const isAuth = appState.phase === "auth";
  const isOnboarding = appState.phase === "onboarding";
  const isHome = appState.phase === "home";

  return (
    <BrowserRouter>
      <Routes>
        {/* Root — redirect based on current phase */}
        <Route
          path="/"
          element={
            isAuth        ? <Navigate to="/login"      replace /> :
            isOnboarding  ? <Navigate to="/onboarding" replace /> :
                            <Navigate to="/home"       replace />
          }
        />

        {/* Auth screens — redirect away if already authenticated */}
        <Route
          path="/login"
          element={
            isHome       ? <Navigate to="/home"       replace /> :
            isOnboarding ? <Navigate to="/onboarding" replace /> :
            <Login onAuth={onAuth} />
          }
        />
        <Route
          path="/signup"
          element={
            isHome       ? <Navigate to="/home"       replace /> :
            isOnboarding ? <Navigate to="/onboarding" replace /> :
            <Signup onAuth={onAuth} />
          }
        />

        {/* Onboarding — redirect to home if profile already exists */}
        <Route
          path="/onboarding"
          element={
            isHome ? <Navigate to="/home" replace /> :
            isOnboarding ? (
              <Onboarding
                athleteId={appState.athleteId}
                onComplete={() =>
                  setAppState({ phase: "home", athleteId: (appState as { phase: "onboarding"; athleteId: string }).athleteId })
                }
              />
            ) : <Navigate to="/" replace />
          }
        />

        {/* Home — redirect to root if not authenticated or not onboarded */}
        <Route
          path="/home"
          element={
            isHome
              ? <Home athleteId={appState.athleteId} />
              : <Navigate to="/" replace />
          }
        />

        <Route
          path="/settings"
          element={
            isHome ? (
              <Settings
                athleteId={appState.athleteId}
                onSignOut={() => {
                  localStorage.removeItem("token");
                  localStorage.removeItem("athleteId");
                  setAppState({ phase: "auth" });
                }}
                onRedoOnboarding={() => {
                  // Profile reset already called by Settings; just update routing state.
                  setAppState({
                    phase: "onboarding",
                    athleteId: (appState as { phase: "home"; athleteId: string }).athleteId,
                  });
                }}
              />
            ) : <Navigate to="/" replace />
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
