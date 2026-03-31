import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import WeightDisplay from "../components/WeightDisplay";
const ATHLETE_ID = localStorage.getItem("athleteId") ?? "test-athlete-001";
export default function Dashboard() {
    const navigate = useNavigate();
    const [athlete, setAthlete] = useState(null);
    useEffect(() => {
        fetch(`/api/athlete/${ATHLETE_ID}`)
            .then((r) => r.json())
            .then(setAthlete)
            .catch(console.error);
    }, []);
    return (_jsxs("div", { className: "flex flex-col h-full bg-background px-6 py-10", children: [_jsx("h1", { className: "text-xl font-semibold text-primary mb-1", children: athlete?.identity?.name ?? "IronMind" }), athlete?.currentCut && (_jsx(WeightDisplay, { currentWeight: athlete.currentCut.currentWeight, targetWeight: athlete.currentCut.targetWeight, competitionDate: athlete.currentCut.competitionDate })), _jsxs("div", { className: "flex flex-col gap-3 mt-10", children: [_jsxs("button", { className: "w-full py-4 bg-surface border border-border rounded-xl text-primary font-medium text-left px-5 min-h-touch active:bg-border", onClick: () => navigate("/session/cut"), children: [_jsx("span", { className: "block text-base", children: "Cut session" }), _jsx("span", { className: "block text-sm text-muted mt-0.5", children: "90-second loop, voice coach active" })] }), _jsxs("button", { className: "w-full py-4 bg-surface border border-border rounded-xl text-primary font-medium text-left px-5 min-h-touch active:bg-border", onClick: () => navigate("/session/protocol"), children: [_jsx("span", { className: "block text-base", children: "Pre-match protocol" }), _jsx("span", { className: "block text-sm text-muted mt-0.5", children: "5-minute ritual before competition" })] }), _jsxs("button", { className: "w-full py-4 bg-surface border border-border rounded-xl text-primary font-medium text-left px-5 min-h-touch active:bg-border", onClick: () => navigate("/session/reset"), children: [_jsx("span", { className: "block text-base", children: "Reset" }), _jsx("span", { className: "block text-sm text-muted mt-0.5", children: "After a loss or bad practice" })] })] }), _jsx("button", { className: "mt-auto text-muted text-sm", onClick: () => navigate("/settings"), children: "Settings" })] }));
}
