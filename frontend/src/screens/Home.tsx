import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Waveform from "../components/Waveform";
import { useConversation } from "../hooks/useConversation";

interface AthleteProfile {
  identity: { name: string };
  currentCut: { currentWeight: number; targetWeight: number } | null;
}

export default function Home({ athleteId }: { athleteId: string }) {
  const navigate = useNavigate();
  const { status, agentMode, start, end } = useConversation(athleteId);
  const [athlete, setAthlete] = useState<AthleteProfile | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isConnected = status === "connected";
  const isConnecting = status === "connecting";
  const isAgentSpeaking = agentMode === "speaking";

  useEffect(() => {
    fetch(`/api/athlete/${encodeURIComponent(athleteId)}`)
      .then((r) => r.json() as Promise<AthleteProfile | null>)
      .then((data) => { if (data?.identity?.name) setAthlete(data); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (isConnected) {
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    } else {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isConnected]);

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const timerStr = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  const cut = athlete?.currentCut;
  const weightRemaining = cut ? (cut.currentWeight - cut.targetWeight).toFixed(1) : null;

  return (
    <div className="flex flex-col h-full bg-background px-6 py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-xl font-semibold text-primary">
            {athlete?.identity.name ?? "IronMind"}
          </h1>
          {cut && weightRemaining && (
            <p className="text-muted text-sm mt-0.5">
              {cut.currentWeight}lbs → {cut.targetWeight}lbs &middot; {weightRemaining}lbs out
            </p>
          )}
        </div>

        <div className="flex items-center gap-4">
          {isConnected && (
            <span className="text-muted text-sm font-mono">{timerStr}</span>
          )}
          <button
            className="text-muted text-sm"
            onClick={() => navigate("/settings")}
          >
            Settings
          </button>
        </div>
      </div>

      {/* Waveform */}
      <div className="flex-1 flex items-center justify-center">
        <Waveform active={isAgentSpeaking} />
      </div>

      {/* Status */}
      {isConnected && (
        <p className="text-center text-muted text-xs mb-4">
          {agentMode === "listening" ? "Listening" : agentMode === "speaking" ? "IronMind" : "Connected"}
        </p>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-3 pb-safe">
        {!isConnected && !isConnecting && (
          <button
            className="w-full py-4 bg-primary text-background rounded-xl font-semibold text-base min-h-touch active:opacity-80"
            onClick={start}
          >
            Connect
          </button>
        )}

        {isConnecting && (
          <button
            className="w-full py-4 bg-surface border border-border rounded-xl text-muted font-medium text-base min-h-touch"
            disabled
          >
            Connecting...
          </button>
        )}

        {isConnected && (
          <button
            className="w-full py-4 bg-surface border border-border rounded-xl text-muted font-medium text-base min-h-touch active:bg-border"
            onClick={async () => { await end(); }}
          >
            End
          </button>
        )}
      </div>
    </div>
  );
}
