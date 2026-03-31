import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Waveform from "../components/Waveform";
import PushToTalk from "../components/PushToTalk";
import WeightDisplay from "../components/WeightDisplay";
import { useSession } from "../hooks/useSession";
import { useVoice } from "../hooks/useVoice";
// athleteId sourced from localStorage — set during onboarding (Phase 7)
// Defaults to test athlete so Phase 4 is testable immediately
const ATHLETE_ID = localStorage.getItem("athleteId") ?? "test-athlete-001";
export default function CutSession() {
    const navigate = useNavigate();
    const { speak, isPlaying, stop } = useVoice(ATHLETE_ID);
    const onNewMessage = useCallback((text) => {
        speak(text);
    }, [speak]);
    const { sessionState, elapsed, currentWeight, targetWeight, startSession, endSession, } = useSession(ATHLETE_ID, onNewMessage);
    // Start session immediately on mount; end it on unmount
    useEffect(() => {
        startSession().catch(console.error);
        return () => { endSession().catch(console.error); };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps
    const handleEnd = async () => {
        stop();
        await endSession();
        navigate("/dashboard");
    };
    const handleSpeech = async (transcript) => {
        const res = await fetch("/api/session/message", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ athleteId: ATHLETE_ID, message: transcript }),
        });
        if (!res.ok)
            return;
        const data = await res.json();
        speak(data.message);
    };
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    return (_jsxs("div", { className: "flex flex-col h-full bg-background px-6 py-10", children: [_jsxs("div", { className: "flex items-center justify-between mb-6", children: [_jsxs("span", { className: "text-muted text-sm font-mono", children: [String(minutes).padStart(2, "0"), ":", String(seconds).padStart(2, "0")] }), _jsx("span", { className: "text-muted text-xs uppercase tracking-widest", children: sessionState }), _jsx("button", { className: "text-muted text-sm", onClick: handleEnd, children: "End" })] }), _jsx(WeightDisplay, { currentWeight: currentWeight, targetWeight: targetWeight, compact: true }), _jsx("div", { className: "flex-1 flex items-center justify-center", children: _jsx(Waveform, { active: isPlaying }) }), _jsx("div", { className: "flex justify-center pb-safe", children: _jsx(PushToTalk, { onSpeech: handleSpeech, disabled: isPlaying }) })] }));
}
