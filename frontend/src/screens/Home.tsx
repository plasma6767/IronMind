import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Waveform from "../components/Waveform";
import { IronMindMascot } from "../components/Mascot";
import { useConversation } from "../hooks/useConversation";
import type { ConversationMode } from "../hooks/useConversation";

interface AthleteProfile {
  identity: { name: string };
  currentCut: { currentWeight: number; targetWeight: number; competitionDate: string } | null;
  mentalPatterns: { currentStreak: number; totalSessions: number } | null;
  mindsetTraining: {
    scores: {
      pressureTolerance: number;
      focusControl: number;
      identityStability: number;
      discomfortTolerance: number;
      adversityResponse: number;
    };
  } | null;
}

interface SessionModeOption {
  value: ConversationMode;
  label: string;
  sub: string;
  connectLabel: string;
  icon: React.ReactNode;
}

// ─── Mode card icons ──────────────────────────────────────────────────────────

function BoltIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M11 2L4.5 11H10L9 18L15.5 9H10L11 2Z"
        fill={active ? "#60A5FA" : "#4a5876"}
      />
    </svg>
  );
}
function ChatIcon({ active }: { active: boolean }) {
  const c = active ? "#60A5FA" : "#4a5876";
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path d="M3 4h14c.6 0 1 .4 1 1v9c0 .6-.4 1-1 1H6l-4 3V5c0-.6.4-1 1-1z" stroke={c} strokeWidth="1.5" fill="none" strokeLinejoin="round" />
    </svg>
  );
}
function CrosshairIcon({ active }: { active: boolean }) {
  const c = active ? "#60A5FA" : "#4a5876";
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <circle cx="10" cy="10" r="3.5" stroke={c} strokeWidth="1.5" />
      <circle cx="10" cy="10" r="8" stroke={c} strokeWidth="1.5" />
      <line x1="10" y1="1" x2="10" y2="5.5" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="10" y1="14.5" x2="10" y2="19" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="1" y1="10" x2="5.5" y2="10" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="14.5" y1="10" x2="19" y2="10" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
function FlagIcon({ active }: { active: boolean }) {
  const c = active ? "#60A5FA" : "#4a5876";
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <line x1="5" y1="2" x2="5" y2="18" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M5 3.5L16.5 7L5 10.5Z" fill={c} />
    </svg>
  );
}

const MODES: SessionModeOption[] = [
  { value: "workout",   label: "Workout",    sub: "Training + mindset challenges", connectLabel: "Start Training",  icon: null },
  { value: "general",   label: "Check-In",   sub: "Open conversation",              connectLabel: "Connect",         icon: null },
  { value: "prematch",  label: "Pre-Match",  sub: "Lock in before you compete",     connectLabel: "Lock In",         icon: null },
  { value: "postmatch", label: "Post-Match", sub: "Debrief — win or loss",          connectLabel: "Talk It Through", icon: null },
];

function getModeIcon(value: ConversationMode, active: boolean) {
  switch (value) {
    case "workout":   return <BoltIcon active={active} />;
    case "general":   return <ChatIcon active={active} />;
    case "prematch":  return <CrosshairIcon active={active} />;
    case "postmatch": return <FlagIcon active={active} />;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcMindsetRating(scores: NonNullable<AthleteProfile["mindsetTraining"]>["scores"]): number {
  const vals = Object.values(scores);
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  return Math.min(99, Math.round((avg / 10) * 99));
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function daysUntil(isoDate: string): number {
  const target = new Date(isoDate);
  target.setHours(0, 0, 0, 0);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / 86400000);
}

function StatCard({ label, value, unit }: { label: string; value: string | number; unit?: string }) {
  return (
    <div className="flex-1 bg-surface border border-border rounded-2xl px-4 py-3 shadow-card">
      <p className="text-muted text-xs font-semibold uppercase tracking-wide mb-1.5">{label}</p>
      <p className="text-2xl font-black text-primary tabular-nums leading-none">{value}</p>
      {unit && <p className="text-muted text-xs font-medium mt-1">{unit}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function Home({ athleteId }: { athleteId: string }) {
  const navigate = useNavigate();
  const {
    status, agentMode, transcript, getVolume,
    sessionDuration, unexpectedDisconnect,
    start, end, reset,
  } = useConversation(athleteId);

  const [athlete, setAthlete] = useState<AthleteProfile | null>(null);
  const [currentWeight, setCurrentWeight] = useState<number | null>(null);
  const [mode, setMode] = useState<ConversationMode>("general");
  const [elapsed, setElapsed] = useState(0);
  const [confirmingEnd, setConfirmingEnd] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [evaluation, setEvaluation] = useState<{ newRating: number; reasoning: string } | null>(null);
  const [evaluating, setEvaluating] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const confirmEndTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const weightSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isConnected    = status === "connected";
  const isConnecting   = status === "connecting";
  const isDisconnected = status === "disconnected";
  const isError        = status === "error";
  const isIdle         = status === "idle";
  const isAgentSpeaking = agentMode === "speaking";
  const isListening    = agentMode === "listening";

  const fetchAthlete = useCallback(() => {
    fetch(`/api/athlete/${encodeURIComponent(athleteId)}`)
      .then((r) => r.json() as Promise<AthleteProfile | null>)
      .then((data) => {
        if (data?.identity?.name) {
          setAthlete(data);
          if (data.currentCut?.currentWeight != null) setCurrentWeight(data.currentCut.currentWeight);
        }
      })
      .catch(() => {});
  }, [athleteId]);

  useEffect(() => { fetchAthlete(); }, [fetchAthlete]);

  useEffect(() => {
    if (isConnected) {
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    } else {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isConnected]);

  useEffect(() => {
    if (!isDisconnected || unexpectedDisconnect || sessionDuration === 0) return;

    setShowSummary(true);
    setEvaluation(null);
    if (transcript.length < 4) return;

    const sessionPayload = { athleteId, transcript, mode, durationSeconds: sessionDuration };
    setEvaluating(true);

    fetch("/api/session/learn", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ athleteId, transcript }),
    }).catch(() => {});

    fetch("/api/session/evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sessionPayload),
    })
      .then((r) => r.json() as Promise<{ ok: boolean; skipped?: string; reasoning?: string; scores?: Record<string, number> }>)
      .then((data) => {
        if (data.scores) {
          const vals = Object.values(data.scores);
          const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
          setEvaluation({ newRating: Math.min(99, Math.round((avg / 10) * 99)), reasoning: data.reasoning ?? "" });
        }
      })
      .catch(() => {})
      .finally(() => setEvaluating(false));
  }, [isDisconnected, unexpectedDisconnect, sessionDuration]);

  useEffect(() => {
    return () => {
      if (confirmEndTimeoutRef.current) clearTimeout(confirmEndTimeoutRef.current);
      if (weightSaveTimeoutRef.current) clearTimeout(weightSaveTimeoutRef.current);
    };
  }, []);

  const adjustWeight = useCallback((delta: number) => {
    if (currentWeight === null) return;
    const next = Math.round((currentWeight + delta) * 10) / 10;
    setCurrentWeight(next);
    if (weightSaveTimeoutRef.current) clearTimeout(weightSaveTimeoutRef.current);
    weightSaveTimeoutRef.current = setTimeout(async () => {
      try {
        await fetch(`/api/athlete/${encodeURIComponent(athleteId)}/weight`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ currentWeight: next }),
        });
      } catch { /* silent */ }
    }, 800);
  }, [currentWeight, athleteId]);

  const handleEndTap = useCallback(async () => {
    if (!confirmingEnd) {
      setConfirmingEnd(true);
      confirmEndTimeoutRef.current = setTimeout(() => setConfirmingEnd(false), 3000);
    } else {
      setConfirmingEnd(false);
      if (confirmEndTimeoutRef.current) clearTimeout(confirmEndTimeoutRef.current);
      await end();
    }
  }, [confirmingEnd, end]);

  const cut = athlete?.currentCut ?? null;
  const weightRemaining = cut && currentWeight != null ? parseFloat((currentWeight - cut.targetWeight).toFixed(1)) : null;
  const daysToComp = cut?.competitionDate ? daysUntil(cut.competitionDate) : null;
  const streak = athlete?.mentalPatterns?.currentStreak ?? 0;
  const mindsetRating = athlete?.mindsetTraining?.scores ? calcMindsetRating(athlete.mindsetTraining.scores) : null;
  const timerStr = `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`;
  const lastAssistantMsg = [...transcript].reverse().find((t) => t.role === "assistant");
  const assistantTurns = transcript.filter((t) => t.role === "assistant").length;
  const selectedMode = MODES.find((m) => m.value === mode)!;

  // ════════════════════════════════════════════════════════════════════════════

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden relative">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 pt-10 pb-5">
        <div className="flex items-center gap-3">
          <IronMindMascot width={38} minimal />
          <div>
            <p className="text-blue-light text-[10px] font-bold tracking-[0.3em] uppercase">IronMind</p>
            <h1 className="text-xl font-black text-primary leading-tight tracking-tight">
              {athlete?.identity.name ?? "Athlete"}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {mindsetRating !== null && isIdle && (
            <div className="flex flex-col items-center">
              <span
                className="text-3xl font-black tabular-nums leading-none"
                style={{
                  background: "linear-gradient(135deg, #60A5FA, #93C5FD)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                {mindsetRating}
              </span>
              <span className="text-muted text-[10px] font-bold uppercase tracking-widest mt-0.5">Rating</span>
            </div>
          )}
          {isConnected && (
            <span className="text-blue-light text-sm font-mono tabular-nums">{timerStr}</span>
          )}
          <button
            className="text-silver text-sm font-semibold min-h-touch flex items-center px-1"
            onClick={() => navigate("/settings")}
          >
            Settings
          </button>
        </div>
      </div>

      {/* ── PRE-SESSION ────────────────────────────────────────────────────── */}
      {isIdle && (
        <div className="flex-1 flex flex-col px-6 pb-6 overflow-y-auto gap-5">

          {/* Stats strip */}
          {(weightRemaining !== null || daysToComp !== null || streak > 0) && (
            <div className="flex gap-3">
              {weightRemaining !== null && <StatCard label="To cut" value={weightRemaining} unit="lbs" />}
              {daysToComp !== null && daysToComp >= 0 && <StatCard label="Days out" value={daysToComp} unit={daysToComp === 1 ? "day" : "days"} />}
              {streak > 0 && <StatCard label="Streak" value={streak} unit={streak === 1 ? "session" : "sessions"} />}
            </div>
          )}

          {/* Weight check-in */}
          {currentWeight !== null && (
            <div className="bg-surface border border-border rounded-2xl px-5 py-4 shadow-card">
              <p className="text-muted text-xs font-bold uppercase tracking-widest mb-3">Today's weight</p>
              <div className="flex items-center justify-between">
                <button
                  className="w-12 h-12 flex items-center justify-center rounded-xl border border-border text-primary text-2xl font-bold active:bg-border transition-colors"
                  onClick={() => adjustWeight(-0.5)}
                >
                  −
                </button>
                <div className="text-center">
                  <span className="text-4xl font-black text-primary tabular-nums">{currentWeight.toFixed(1)}</span>
                  <span className="text-silver text-sm ml-1 font-semibold">lbs</span>
                  {cut && <p className="text-muted text-xs mt-0.5 font-medium">goal {cut.targetWeight}</p>}
                </div>
                <button
                  className="w-12 h-12 flex items-center justify-center rounded-xl border border-border text-primary text-2xl font-bold active:bg-border transition-colors"
                  onClick={() => adjustWeight(0.5)}
                >
                  +
                </button>
              </div>
            </div>
          )}

          {/* Session mode selector */}
          <div>
            <p className="text-muted text-xs font-bold uppercase tracking-widest mb-3">Session Type</p>
            <div className="grid grid-cols-2 gap-2">
              {MODES.map((m) => {
                const isSelected = mode === m.value;
                return (
                  <button
                    key={m.value}
                    onClick={() => setMode(m.value)}
                    className={`flex flex-col items-start px-4 py-4 rounded-2xl border text-left transition-all ${
                      isSelected ? "border-blue-glow bg-blue-deeper" : "bg-surface border-border active:bg-surface-2"
                    }`}
                    style={isSelected ? { boxShadow: "0 0 0 1px rgba(37,99,235,0.4), 0 0 16px rgba(37,99,235,0.14)" } : {}}
                  >
                    <div className="mb-1.5">{getModeIcon(m.value, isSelected)}</div>
                    <span className={`font-bold text-sm leading-tight mb-1 ${isSelected ? "text-blue-lighter" : "text-primary"}`}>
                      {m.label}
                    </span>
                    <span className={`text-xs leading-tight font-medium ${isSelected ? "text-blue-light opacity-70" : "text-muted"}`}>
                      {m.sub}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Connect */}
          <button
            className="w-full py-5 rounded-2xl font-black text-lg text-white shadow-blue-md active:scale-[0.98] transition-transform mt-auto"
            style={{ background: "linear-gradient(135deg, #1D4ED8 0%, #2563EB 60%, #1E40AF 100%)" }}
            onClick={() => start(mode)}
          >
            {selectedMode.connectLabel}
          </button>
        </div>
      )}

      {/* ── CONNECTING ─────────────────────────────────────────────────────── */}
      {isConnecting && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 pb-10 gap-4">
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="w-2.5 h-2.5 rounded-full bg-blue animate-connect-pulse" style={{ animationDelay: `${i * 0.2}s` }} />
            ))}
          </div>
          <p className="text-silver text-sm font-semibold">{selectedMode.label}...</p>
        </div>
      )}

      {/* ── ACTIVE SESSION ─────────────────────────────────────────────────── */}
      {isConnected && (
        <div className="flex-1 flex flex-col px-6 pb-6">
          <div className="flex items-center gap-3 mb-4">
            <p className="text-muted text-xs font-bold uppercase tracking-widest">{selectedMode.label}</p>
            {isListening && (
              <div className="flex items-center gap-1.5 ml-auto">
                <div className="relative w-3 h-3">
                  <div className="absolute inset-0 rounded-full bg-blue-light animate-listen-ring" />
                  <div className="absolute inset-0 rounded-full bg-blue-light animate-listen-ring" style={{ animationDelay: "0.5s" }} />
                  <div className="w-3 h-3 rounded-full bg-blue-light" />
                </div>
                <span className="text-blue-light text-sm font-bold">Listening</span>
              </div>
            )}
          </div>

          <div className="flex-1 flex items-center justify-center">
            <Waveform active={isAgentSpeaking} getVolume={getVolume} />
          </div>

          {!isListening && (
            <p className="text-center text-muted text-xs font-bold tracking-widest uppercase mb-4">
              {isAgentSpeaking ? "IronMind" : "Connected"}
            </p>
          )}

          {isAgentSpeaking && lastAssistantMsg && (
            <p className="text-center text-primary text-sm leading-relaxed max-w-xs mx-auto mb-6 animate-fade-in font-medium">
              {lastAssistantMsg.content}
            </p>
          )}

          <button
            className={`w-full py-4 rounded-2xl font-bold text-base min-h-touch transition-all ${
              confirmingEnd ? "bg-danger text-white" : "bg-surface-2 border border-border text-silver active:bg-border"
            }`}
            onClick={handleEndTap}
          >
            {confirmingEnd ? "Tap again to end" : "End"}
          </button>
        </div>
      )}

      {/* ── ERROR ──────────────────────────────────────────────────────────── */}
      {(isError || (isDisconnected && unexpectedDisconnect)) && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 pb-10 gap-6">
          <p className="text-silver text-sm text-center font-medium">
            {isError ? "Couldn't connect — check your connection and try again." : "Session ended unexpectedly."}
          </p>
          <button
            className="w-full py-5 rounded-2xl font-black text-lg text-white shadow-blue-md active:scale-[0.98] transition-transform"
            style={{ background: "linear-gradient(135deg, #1D4ED8 0%, #2563EB 60%, #1E40AF 100%)" }}
            onClick={() => { reset(); start(mode); }}
          >
            Reconnect
          </button>
          <button className="text-silver text-sm font-semibold" onClick={reset}>Go back</button>
        </div>
      )}

      {/* ── POST-SESSION SUMMARY ───────────────────────────────────────────── */}
      {showSummary && (
        <div className="absolute inset-x-0 bottom-0 bg-surface border-t border-border rounded-t-3xl px-6 pt-5 pb-10 animate-slide-up shadow-card">
          <div className="w-10 h-1 rounded-full mx-auto mb-6" style={{ background: "linear-gradient(90deg, #1D4ED8, #60A5FA)" }} />

          <p className="text-silver text-xs font-bold uppercase tracking-widest mb-1">{selectedMode.label} complete</p>
          <div className="flex items-baseline gap-4 mb-6">
            <span className="text-5xl font-black text-primary tabular-nums">{formatDuration(sessionDuration)}</span>
            <p className="text-silver text-sm font-medium">{assistantTurns} exchange{assistantTurns !== 1 ? "s" : ""}</p>
          </div>

          {evaluating && (
            <div className="flex items-center gap-2 mb-6">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full bg-blue animate-connect-pulse" style={{ animationDelay: `${i * 0.2}s` }} />
                ))}
              </div>
              <p className="text-silver text-sm font-medium">Updating mindset rating...</p>
            </div>
          )}

          {evaluation && (
            <div className="border border-border-light rounded-2xl px-4 py-4 mb-6 bg-surface-2">
              <div className="flex items-center justify-between mb-2">
                <p className="text-muted text-xs font-bold uppercase tracking-widest">Mindset Rating</p>
                <div className="flex items-baseline gap-1.5">
                  {mindsetRating !== null && mindsetRating !== evaluation.newRating && (
                    <span className="text-muted text-sm tabular-nums line-through">{mindsetRating}</span>
                  )}
                  <span className="text-2xl font-black tabular-nums" style={{ background: "linear-gradient(135deg, #60A5FA, #93C5FD)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                    {evaluation.newRating}
                  </span>
                </div>
              </div>
              {evaluation.reasoning && (
                <p className="text-silver text-xs leading-relaxed font-medium">{evaluation.reasoning}</p>
              )}
            </div>
          )}

          <button
            className="w-full py-5 rounded-2xl font-black text-lg text-white shadow-blue-md active:scale-[0.98] transition-transform disabled:opacity-50"
            style={{ background: evaluating ? "#1a2744" : "linear-gradient(135deg, #1D4ED8 0%, #2563EB 60%, #1E40AF 100%)" }}
            disabled={evaluating}
            onClick={() => { setShowSummary(false); setEvaluation(null); reset(); fetchAthlete(); }}
          >
            {evaluating ? "One moment..." : "Done"}
          </button>
        </div>
      )}
    </div>
  );
}
