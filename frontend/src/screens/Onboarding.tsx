import { useState } from "react";
import Waveform from "../components/Waveform";
import { useConversation } from "../hooks/useConversation";

interface OnboardingProps {
  athleteId: string;
  onComplete: () => void;
}

export default function Onboarding({ athleteId, onComplete }: OnboardingProps) {
  const { status, agentMode, transcript, start, end } = useConversation(athleteId);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const isConnected = status === "connected";
  const isConnecting = status === "connecting";
  const isAgentSpeaking = agentMode === "speaking";
  const turnCount = transcript.length;

  async function handleDone() {
    setSaveError(null);
    setIsSaving(true);

    // End the conversation first, then save — order matters
    await end();

    try {
      const res = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ athleteId, transcript }),
      });

      if (!res.ok) {
        const { error } = (await res.json()) as { error: string };
        throw new Error(error ?? "Unknown error");
      }

      onComplete();
    } catch (err) {
      setSaveError(String(err));
      setIsSaving(false);
    }
  }

  return (
    <div className="flex flex-col h-full bg-background px-6 py-10">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-xl font-semibold text-primary">IronMind</h1>
        <p className="text-muted text-sm mt-1">
          {isConnected ? "Listening..." : "Let's get to know you."}
        </p>
      </div>

      {/* Waveform — active when agent is speaking */}
      <div className="flex-1 flex items-center justify-center">
        <Waveform active={isAgentSpeaking} />
      </div>

      {/* Status indicator */}
      {isConnected && (
        <p className="text-center text-muted text-xs mb-4">
          {agentMode === "listening" ? "Your turn" : agentMode === "speaking" ? "IronMind is speaking" : ""}
        </p>
      )}

      {/* Error */}
      {(status === "error" || saveError) && (
        <p className="text-center text-sm text-red-400 mb-4">
          {saveError ?? "Connection error — try again"}
        </p>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-3 pb-safe">
        {!isConnected && !isConnecting && !isSaving && (
          <button
            className="w-full py-4 bg-primary text-background rounded-xl font-semibold text-base min-h-touch active:opacity-80"
            onClick={() => start()}
          >
            Start
          </button>
        )}

        {isSaving && (
          <button
            className="w-full py-4 bg-surface border border-border rounded-xl text-muted font-medium text-base min-h-touch"
            disabled
          >
            Saving your profile...
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
          <>
            {/* Show "I'm done" only after enough conversation */}
            {turnCount >= 8 && (
              <button
                className="w-full py-4 bg-primary text-background rounded-xl font-semibold text-base min-h-touch active:opacity-80 disabled:opacity-50"
                onClick={handleDone}
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : "I'm ready"}
              </button>
            )}

            <button
              className="w-full py-4 bg-surface border border-border rounded-xl text-muted font-medium text-base min-h-touch active:bg-border"
              onClick={end}
            >
              End conversation
            </button>
          </>
        )}
      </div>
    </div>
  );
}
