import Waveform from "../components/Waveform";
import PushToTalk from "../components/PushToTalk";

const PHASES = ["Breathing", "Visualization", "Identity", "Ignition"] as const;

export default function Protocol() {
  // TODO: Phase 6 — wire protocol phase sequence
  const currentPhase = 0;
  const opponentName = ""; // loaded from athlete DO
  const isAgentSpeaking = false;

  return (
    <div className="flex flex-col h-full bg-background px-6 py-10">
      {/* Phase indicator */}
      <div className="flex gap-1.5 mb-6">
        {PHASES.map((_, i) => (
          <div
            key={i}
            className={`h-0.5 flex-1 rounded-full ${i <= currentPhase ? "bg-primary" : "bg-border"}`}
          />
        ))}
      </div>

      <div className="flex items-center justify-between mb-10">
        <span className="text-primary text-sm font-medium">{PHASES[currentPhase]}</span>
        {opponentName && (
          <span className="text-muted text-sm">vs {opponentName}</span>
        )}
      </div>

      {/* Waveform */}
      <div className="flex-1 flex items-center justify-center">
        <Waveform active={isAgentSpeaking} />
      </div>

      {/* Push to talk */}
      <div className="flex justify-center pb-safe">
        <PushToTalk onSpeech={(transcript) => {
          // TODO: Phase 6 — send to /api/protocol/next with athlete input
          console.log("athlete said:", transcript);
        }} />
      </div>
    </div>
  );
}
