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

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            appState.phase === "auth" ? <Navigate to="/login" replace /> :
            appState.phase === "onboarding" ? <Navigate to="/onboarding" replace /> :
            <Navigate to="/home" replace />
          }
        />
        <Route path="/login" element={<Login onAuth={onAuth} />} />
        <Route path="/signup" element={<Signup onAuth={onAuth} />} />
        <Route
          path="/onboarding"
          element={
            appState.phase === "onboarding"
              ? <Onboarding athleteId={appState.athleteId} />
              : <Navigate to="/" replace />
          }
        />
        <Route
          path="/home"
          element={
            appState.phase === "home"
              ? <Home athleteId={appState.athleteId} />
              : <Navigate to="/" replace />
          }
        />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
