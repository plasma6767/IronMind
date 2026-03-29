import { useNavigate } from "react-router-dom";
import Waveform from "../components/Waveform";
import PushToTalk from "../components/PushToTalk";
import WeightDisplay from "../components/WeightDisplay";
import { useSession } from "../hooks/useSession";

export default function CutSession() {
  const navigate = useNavigate();

  // TODO: Phase 4 — wire useSession hook
  const { sessionMinute, sessionState, isAgentSpeaking, currentWeight, targetWeight } = {
    sessionMinute: 0,
    sessionState: "EARLY" as const,
    isAgentSpeaking: false,
    currentWeight: 0,
    targetWeight: 0,
  };

  return (
    <div className="flex flex-col h-full bg-background px-6 py-10">
      {/* Header row: timer + state */}
      <div className="flex items-center justify-between mb-6">
        <span className="text-muted text-sm font-mono">{String(sessionMinute).padStart(2, "0")}:00</span>
        <span className="text-muted text-xs uppercase tracking-widest">{sessionState}</span>
        <button
          className="text-muted text-sm"
          onClick={() => navigate("/dashboard")}
        >
          End
        </button>
      </div>

      {/* Weight always visible */}
      <WeightDisplay
        currentWeight={currentWeight}
        targetWeight={targetWeight}
        compact
      />

      {/* Waveform — center of screen */}
      <div className="flex-1 flex items-center justify-center">
        <Waveform active={isAgentSpeaking} />
      </div>

      {/* Push to talk — large, thumb-reachable */}
      <div className="flex justify-center pb-safe">
        <PushToTalk onSpeech={(transcript) => {
          // TODO: Phase 4 — send to /api/session/message
          console.log("athlete said:", transcript);
        }} />
      </div>
    </div>
  );
}
