import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import Waveform from "../components/Waveform";
import PushToTalk from "../components/PushToTalk";
const PHASES = ["Breathing", "Visualization", "Identity", "Ignition"];
export default function Protocol() {
    // TODO: Phase 6 — wire protocol phase sequence
    const currentPhase = 0;
    const opponentName = ""; // loaded from athlete DO
    const isAgentSpeaking = false;
    return (_jsxs("div", { className: "flex flex-col h-full bg-background px-6 py-10", children: [_jsx("div", { className: "flex gap-1.5 mb-6", children: PHASES.map((_, i) => (_jsx("div", { className: `h-0.5 flex-1 rounded-full ${i <= currentPhase ? "bg-primary" : "bg-border"}` }, i))) }), _jsxs("div", { className: "flex items-center justify-between mb-10", children: [_jsx("span", { className: "text-primary text-sm font-medium", children: PHASES[currentPhase] }), opponentName && (_jsxs("span", { className: "text-muted text-sm", children: ["vs ", opponentName] }))] }), _jsx("div", { className: "flex-1 flex items-center justify-center", children: _jsx(Waveform, { active: isAgentSpeaking }) }), _jsx("div", { className: "flex justify-center pb-safe", children: _jsx(PushToTalk, { onSpeech: (transcript) => {
                        // TODO: Phase 6 — send to /api/protocol/next with athlete input
                        console.log("athlete said:", transcript);
                    } }) })] }));
}
