import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import Waveform from "../components/Waveform";
import PushToTalk from "../components/PushToTalk";
// Steps: basic profile → goals → mental profile → identity anchors → voice clone → current cut
const STEPS = [
    "Basic profile",
    "Goals",
    "Mental profile",
    "Identity anchors",
    "Voice clone",
    "Current cut",
];
export default function Onboarding() {
    // TODO: Phase 7
    // - Track current step index
    // - Wire PushToTalk → POST /api/onboarding/message
    // - Render agent waveform when speaking
    // - Show step progress indicator
    // - On completion, navigate to /dashboard
    const currentStep = 0;
    const isAgentSpeaking = false;
    return (_jsxs("div", { className: "flex flex-col h-full bg-background px-6 py-10", children: [_jsx("div", { className: "flex gap-1.5 mb-10", children: STEPS.map((_, i) => (_jsx("div", { className: `h-0.5 flex-1 rounded-full ${i <= currentStep ? "bg-primary" : "bg-border"}` }, i))) }), _jsx("p", { className: "text-muted text-sm mb-2", children: STEPS[currentStep] }), _jsx("div", { className: "flex-1 flex items-center justify-center", children: _jsx(Waveform, { active: isAgentSpeaking }) }), _jsx("div", { className: "flex justify-center pb-safe", children: _jsx(PushToTalk, { onSpeech: (transcript) => {
                        // TODO: send transcript to /api/onboarding/message
                        console.log("transcript:", transcript);
                    } }) })] }));
}
