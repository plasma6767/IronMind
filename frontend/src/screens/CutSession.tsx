import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Waveform from "../components/Waveform";
import PushToTalk from "../components/PushToTalk";
import WeightDisplay from "../components/WeightDisplay";
import { useSession } from "../hooks/useSession";
import { useVoice } from "../hooks/useVoice";

const ATHLETE_ID = localStorage.getItem("athleteId") ?? "test-athlete-001";

export default function CutSession() {
  const navigate = useNavigate();
  const [isStarted, setIsStarted] = useState(false);
  const [lastMessage, setLastMessage] = useState<string | null>(null);
  const [textInput, setTextInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const sessionStartedRef = useRef(false);

  const { speak, isPlaying, stop, unlockAudio, error: audioError } = useVoice(ATHLETE_ID);

  const onNewMessage = useCallback((text: string) => {
    setLastMessage(text);
    speak(text);
  }, [speak]);

  const { sessionState, elapsed, currentWeight, targetWeight, startSession, endSession } =
    useSession(ATHLETE_ID, onNewMessage);

  useEffect(() => {
    return () => {
      if (sessionStartedRef.current) endSession().catch(console.error);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleBegin = async () => {
    unlockAudio();
    setIsStarted(true);
    sessionStartedRef.current = true;
    await startSession();
  };

  const handleEnd = async () => {
    stop();
    sessionStartedRef.current = false;
    await endSession();
    navigate("/dashboard");
  };

  const handleSpeech = async (transcript: string) => {
    if (!transcript.trim()) return;
    setIsSending(true);
    try {
      const res = await fetch("/api/session/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ athleteId: ATHLETE_ID, message: transcript }),
      });
      if (!res.ok) return;
      const data = await res.json() as { message: string };
      setLastMessage(data.message);
      speak(data.message);
    } finally {
      setIsSending(false);
    }
  };

  const handleTextSend = async () => {
    if (!textInput.trim() || isSending) return;
    const msg = textInput.trim();
    setTextInput("");
    await handleSpeech(msg);
  };

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;

  // ─── Pre-session ──────────────────────────────────────────────────────────────

  if (!isStarted) {
    return (
      <div className="flex flex-col h-full bg-background items-center justify-center px-6 gap-8">
        <div className="text-center">
          <p className="text-muted text-sm uppercase tracking-widest mb-2">Cut session</p>
          {currentWeight > 0 && (
            <p className="text-primary text-lg font-mono">{currentWeight} → {targetWeight} lbs</p>
          )}
        </div>
        <button
          className="w-32 h-32 rounded-full border-2 border-border text-primary text-sm uppercase tracking-widest active:scale-95 transition-transform"
          onClick={handleBegin}
        >
          Begin
        </button>
        <button className="text-muted text-sm" onClick={() => navigate("/dashboard")}>Back</button>
      </div>
    );
  }

  // ─── Active session ───────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full bg-background px-6 py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <span className="text-muted text-sm font-mono">
          {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
        </span>
        <span className="text-muted text-xs uppercase tracking-widest">{sessionState}</span>
        <button className="text-muted text-sm" onClick={handleEnd}>End</button>
      </div>

      <WeightDisplay currentWeight={currentWeight} targetWeight={targetWeight} compact />

      {/* Waveform + message */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6">
        <Waveform active={isPlaying || isSending} />
        {lastMessage && (
          <p className="text-muted text-sm text-center max-w-xs leading-relaxed px-2">
            {lastMessage}
          </p>
        )}
        {audioError && (
          <p className="text-red-500 text-xs text-center max-w-xs">{audioError}</p>
        )}
      </div>

      {/* Input area: push-to-talk + text fallback */}
      <div className="flex flex-col items-center gap-4 pb-safe">
        <PushToTalk onSpeech={handleSpeech} disabled={isPlaying || isSending} />

        {/* Text input — bypasses speech recognition for testing */}
        <div className="flex w-full gap-2">
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleTextSend()}
            placeholder="Type a message..."
            className="flex-1 bg-surface border border-border rounded-lg px-4 py-2 text-sm text-primary placeholder:text-muted outline-none"
          />
          <button
            onClick={handleTextSend}
            disabled={isSending || !textInput.trim()}
            className="px-4 py-2 border border-border rounded-lg text-sm text-primary disabled:opacity-30 active:scale-95 transition-transform"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
