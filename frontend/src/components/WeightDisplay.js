import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
export default function WeightDisplay({ currentWeight, targetWeight, competitionDate, compact = false, }) {
    const remaining = Math.max(0, currentWeight - targetWeight);
    const daysLeft = competitionDate
        ? Math.ceil((new Date(competitionDate).getTime() - Date.now()) / 86_400_000)
        : null;
    if (compact) {
        return (_jsxs("div", { className: "flex items-baseline gap-3 mb-4", children: [_jsx("span", { className: "text-2xl font-semibold text-primary font-mono", children: currentWeight.toFixed(1) }), _jsxs("span", { className: "text-muted text-sm", children: ["-", remaining.toFixed(1), " to ", targetWeight] })] }));
    }
    return (_jsxs("div", { className: "bg-surface border border-border rounded-xl p-4 mt-6", children: [_jsxs("div", { className: "flex items-baseline gap-2 mb-1", children: [_jsx("span", { className: "text-3xl font-semibold text-primary font-mono", children: currentWeight.toFixed(1) }), _jsx("span", { className: "text-muted text-sm", children: "lbs" })] }), _jsxs("div", { className: "flex items-center gap-3 text-sm", children: [_jsxs("span", { className: "text-muted", children: [remaining.toFixed(1), " lbs to ", targetWeight] }), daysLeft !== null && (_jsxs(_Fragment, { children: [_jsx("span", { className: "text-border", children: "\u00B7" }), _jsxs("span", { className: "text-muted", children: [daysLeft, "d out"] })] }))] })] }));
}
