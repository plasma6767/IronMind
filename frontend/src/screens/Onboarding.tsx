import { useState } from "react";
import Waveform from "../components/Waveform";
import { IronMindMascot } from "../components/Mascot";
import { useConversation } from "../hooks/useConversation";

interface OnboardingProps {
  athleteId: string;
  onComplete: () => void;
}

// ─── Mic icon ─────────────────────────────────────────────────────────────────

function MicIcon({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
      <circle cx="16" cy="16" r="15" stroke="#1a2744" strokeWidth="1.5" />
      <path d="M12 12 C12 9.8 13.8 8 16 8 C18.2 8 20 9.8 20 12 L20 16 C20 18.2 18.2 20 16 20 C13.8 20 12 18.2 12 16 Z" stroke="#60A5FA" strokeWidth="1.4" fill="none" />
      <path d="M9 17 C9 21.4 12.1 25 16 25 C19.9 25 23 21.4 23 17" stroke="#60A5FA" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      <line x1="16" y1="25" x2="16" y2="28" stroke="#60A5FA" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="13" y1="28" x2="19" y2="28" stroke="#60A5FA" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function Onboarding({ athleteId, onComplete }: OnboardingProps) {
  const { status, agentMode, transcript, start, end } = useConversation(athleteId);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const isConnected   = status === "connected";
  const isConnecting  = status === "connecting";
  const isAgentSpeaking = agentMode === "speaking";
  const isListening   = agentMode === "listening";
  const turnCount     = transcript.length;
  const progressPct   = Math.min(100, Math.round((turnCount / 16) * 100));

  async function handleDone() {
    setSaveError(null);
    setIsSaving(true);
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
    <div className="flex flex-col min-h-full bg-background bg-grid px-6 py-10">

      {/* Header — mascot + wordmark */}
      <div className="flex items-center gap-3 mb-8">
        <IronMindMascot width={40} minimal />
        <div>
          <p className="text-blue-light text-xs font-bold tracking-[0.3em] uppercase">IronMind</p>
          <p className="text-primary font-bold text-base leading-tight">
            {isConnected ? "Tell me about yourself." : "Let's get to know you."}
          </p>
        </div>
      </div>

      {/* Step 2 indicator */}
      <div className="flex items-center gap-2 mb-6">
        <div className="flex-1 h-[3px] rounded-full bg-blue" />
        <div className="flex-1 h-[3px] rounded-full" style={{ background: isConnected ? "linear-gradient(90deg, #1D4ED8, #60A5FA)" : "#1a2744" }} />
        <div className="flex-1 h-[3px] rounded-full bg-border" />
        <span className="text-muted text-xs font-semibold ml-1 tracking-wide">2 of 3</span>
      </div>

      {/* Profile-building progress bar */}
      {isConnected && (
        <div className="mb-5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-muted text-xs font-semibold uppercase tracking-wide">Profile building</span>
            <span className="text-blue-light text-xs font-bold">{progressPct}%</span>
          </div>
          <div className="h-1.5 bg-border rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progressPct}%`,
                background: "linear-gradient(90deg, #1D4ED8, #60A5FA)",
              }}
            />
          </div>
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col items-center justify-center py-6">
        {!isConnected && !isConnecting ? (
          /* Pre-connect idle state */
          <div className="flex flex-col items-center gap-6 text-center">
            <div className="relative">
              <div className="absolute inset-0 rounded-full blur-xl bg-blue opacity-10 scale-125" />
              <MicIcon size={56} />
            </div>
            <div className="max-w-[240px]">
              <p className="text-primary font-bold text-lg mb-2">Voice interview</p>
              <p className="text-silver text-sm leading-relaxed font-medium">
                IronMind will ask you questions. Answer naturally — this
                isn't a form. Takes about 5 minutes.
              </p>
            </div>
            <div className="flex flex-col gap-2 w-full max-w-[240px]">
              {[
                "Your sport + weight class",
                "What you're competing for",
                "What drives you",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-surface-2 border border-border"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-light flex-shrink-0" />
                  <span className="text-silver text-xs font-medium">{item}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 w-full">
            {/* Listening indicator */}
            {isListening && (
              <div className="flex items-center gap-2 mb-1">
                <div className="relative w-3 h-3">
                  <div className="absolute inset-0 rounded-full bg-blue-light animate-listen-ring" />
                  <div className="absolute inset-0 rounded-full bg-blue-light animate-listen-ring" style={{ animationDelay: "0.5s" }} />
                  <div className="w-3 h-3 rounded-full bg-blue-light" />
                </div>
                <span className="text-blue-light text-sm font-bold">Your turn</span>
              </div>
            )}
            <Waveform active={isAgentSpeaking} getVolume={undefined} />
            {isAgentSpeaking && (
              <p className="text-silver text-xs font-semibold uppercase tracking-widest">
                IronMind speaking
              </p>
            )}
          </div>
        )}
      </div>

      {/* Error */}
      {(status === "error" || saveError) && (
        <p className="text-center text-sm text-red-400 font-semibold mb-4">
          {saveError ?? "Connection error — try again"}
        </p>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-3">
        {!isConnected && !isConnecting && !isSaving && (
          <button
            className="w-full py-4 rounded-2xl font-bold text-lg text-white shadow-blue-sm active:scale-[0.98] transition-transform"
            style={{ background: "linear-gradient(135deg, #1D4ED8 0%, #2563EB 60%, #1E40AF 100%)" }}
            onClick={() => start()}
          >
            Start Interview
          </button>
        )}

        {isSaving && (
          <div className="w-full py-4 bg-surface-2 border border-border rounded-2xl flex items-center justify-center gap-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="w-2 h-2 rounded-full bg-blue animate-connect-pulse" style={{ animationDelay: `${i * 0.2}s` }} />
            ))}
            <span className="text-silver text-sm font-semibold ml-1">Building your profile...</span>
          </div>
        )}

        {isConnecting && (
          <div className="flex items-center justify-center gap-2 py-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="w-2.5 h-2.5 rounded-full bg-blue animate-connect-pulse" style={{ animationDelay: `${i * 0.2}s` }} />
            ))}
          </div>
        )}

        {isConnected && (
          <>
            {turnCount >= 8 && (
              <button
                className="w-full py-4 rounded-2xl font-bold text-lg text-white shadow-blue-sm active:scale-[0.98] transition-transform disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #1D4ED8 0%, #2563EB 60%, #1E40AF 100%)" }}
                onClick={handleDone}
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : "I'm Ready"}
              </button>
            )}
            <button
              className="w-full py-4 bg-surface-2 border border-border rounded-2xl text-silver font-semibold text-base active:bg-border"
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
