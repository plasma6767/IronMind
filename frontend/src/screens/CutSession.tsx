import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Waveform from "../components/Waveform";
import WeightDisplay from "../components/WeightDisplay";
import { useConversation } from "../hooks/useConversation";

const ATHLETE_ID = "athlete-001";

export default function CutSession() {
  const navigate = useNavigate();
  const { status, agentMode, start, end } = useConversation(ATHLETE_ID);

  const [elapsed, setElapsed] = useState(0); // seconds since connected
  const [currentWeight, setCurrentWeight] = useState(0);
  const [targetWeight, setTargetWeight] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isConnected = status === "connected";
  const isConnecting = status === "connecting";
  const isAgentSpeaking = agentMode === "speaking";

  // Load weight data on mount
  useEffect(() => {
    fetch(`/api/athlete/${ATHLETE_ID}`)
      .then((r) => r.json() as Promise<{ currentCut?: { currentWeight: number; targetWeight: number } }>)
      .then((data) => {
        if (data.currentCut) {
          setCurrentWeight(data.currentCut.currentWeight);
          setTargetWeight(data.currentCut.targetWeight);
        }
      })
      .catch(() => {});
  }, []);

  // Run elapsed timer while connected
  useEffect(() => {
    if (isConnected) {
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isConnected]);

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const timerStr = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  async function handleEnd() {
    await end();
    navigate("/dashboard");
  }

  return (
    <div className="flex flex-col h-full bg-background px-6 py-10">
      {/* Header row: timer + end button */}
      <div className="flex items-center justify-between mb-6">
        <span className="text-muted text-sm font-mono">{isConnected ? timerStr : "--:--"}</span>
        <span className="text-muted text-xs uppercase tracking-widest">
          {isConnecting ? "Connecting" : isConnected ? "Live" : "Cut Session"}
        </span>
        <button className="text-muted text-sm" onClick={handleEnd}>
          End
        </button>
      </div>

      {/* Weight display — shown when data loaded */}
      {(currentWeight > 0 || targetWeight > 0) && (
        <WeightDisplay
          currentWeight={currentWeight}
          targetWeight={targetWeight}
          compact
        />
      )}

      {/* Waveform — center of screen */}
      <div className="flex-1 flex items-center justify-center">
        <Waveform active={isAgentSpeaking} />
      </div>

      {/* Connect prompt / status */}
      <div className="flex justify-center pb-safe">
        {!isConnected && !isConnecting && (
          <button
            className="w-full py-4 bg-primary text-background rounded-xl font-semibold text-base min-h-touch active:opacity-80"
            onClick={start}
          >
            Connect
          </button>
        )}

        {isConnecting && (
          <p className="text-muted text-sm">Connecting...</p>
        )}

        {isConnected && (
          <p className="text-muted text-xs text-center">
            {agentMode === "listening"
              ? "Speak freely"
              : agentMode === "speaking"
              ? "IronMind is speaking"
              : "Connected"}
          </p>
        )}
      </div>
    </div>
  );
}
