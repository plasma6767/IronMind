import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
    return (_jsx(BrowserRouter, { children: _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: isOnboarded ? _jsx(Navigate, { to: "/dashboard", replace: true }) : _jsx(Navigate, { to: "/onboarding", replace: true }) }), _jsx(Route, { path: "/onboarding", element: _jsx(Onboarding, {}) }), _jsx(Route, { path: "/dashboard", element: _jsx(Dashboard, {}) }), _jsx(Route, { path: "/session/cut", element: _jsx(CutSession, {}) }), _jsx(Route, { path: "/session/protocol", element: _jsx(Protocol, {}) }), _jsx(Route, { path: "/session/reset", element: _jsx(Reset, {}) }), _jsx(Route, { path: "/settings", element: _jsx(Settings, {}) })] }) }));
}
