import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Onboarding from "./screens/Onboarding";
import Dashboard from "./screens/Dashboard";
import CutSession from "./screens/CutSession";
import Protocol from "./screens/Protocol";
import Reset from "./screens/Reset";
import Settings from "./screens/Settings";

export default function App() {
  // Phase 7 will wire real onboarding check — hardcoded true so dashboard is reachable
  const isOnboarded = true;

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={isOnboarded ? <Navigate to="/dashboard" replace /> : <Navigate to="/onboarding" replace />}
        />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/session/cut" element={<CutSession />} />
        <Route path="/session/protocol" element={<Protocol />} />
        <Route path="/session/reset" element={<Reset />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </BrowserRouter>
  );
}
