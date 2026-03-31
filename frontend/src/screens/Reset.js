import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import Waveform from "../components/Waveform";
import PushToTalk from "../components/PushToTalk";
// Minimal by design — just waveform and push-to-talk on dark background.
// This is a private space. Nothing else belongs here.
export default function Reset() {
    const isAgentSpeaking = false;
    return (_jsxs("div", { className: "flex flex-col h-full bg-background", children: [_jsx("div", { className: "flex-1 flex items-center justify-center", children: _jsx(Waveform, { active: isAgentSpeaking }) }), _jsx("div", { className: "flex justify-center pb-safe px-6", children: _jsx(PushToTalk, { onSpeech: (transcript) => {
                        // TODO: Phase 6 — send to /api/reset/message
                        console.log("athlete said:", transcript);
                    } }) })] }));
}
