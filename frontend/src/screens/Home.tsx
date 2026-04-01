import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Waveform from "../components/Waveform";
import { useConversation } from "../hooks/useConversation";
import type { ConversationMode } from "../hooks/useConversation";

interface AthleteProfile {
  identity: { name: string };
  currentCut: {
    currentWeight: number;
    targetWeight: number;
    competitionDate: string;
  } | null;
  mentalPatterns: {
    currentStreak: number;
    totalSessions: number;
  } | null;
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
}

const MODES: SessionModeOption[] = [
  {
    value: "workout",
    label: "Workout",
    sub: "Training + mindset challenges",
    connectLabel: "Start Training",
  },
  {
    value: "general",
    label: "Check-In",
    sub: "Open conversation",
    connectLabel: "Connect",
  },
  {
    value: "prematch",
    label: "Pre-Match",
    sub: "Lock in before you compete",
    connectLabel: "Lock In",
  },
  {
    value: "postmatch",
    label: "Post-Match",
    sub: "Debrief — win or loss",
    connectLabel: "Talk It Through",
  },
];

function calcMindsetRating(scores: AthleteProfile["mindsetTraining"] extends null ? never : NonNullable<AthleteProfile["mindsetTraining"]>["scores"]): number {
  const vals = Object.values(scores);
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  return Math.min(99, Math.round((avg / 10) * 99));
}

function ratingColor(rating: number): string {
  if (rating >= 80) return "text-primary";
  if (rating >= 60) return "text-primary opacity-80";
  return "text-muted";
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
  const [evaluation, setEvaluation] = useState<{
    newRating: number;
    reasoning: string;
  } | null>(null);
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

  // ── Fetch athlete ────────────────────────────────────────────────────────────

  const fetchAthlete = useCallback(() => {
    fetch(`/api/athlete/${encodeURIComponent(athleteId)}`)
      .then((r) => r.json() as Promise<AthleteProfile | null>)
      .then((data) => {
        if (data?.identity?.name) {
          setAthlete(data);
          if (data.currentCut?.currentWeight != null) {
            setCurrentWeight(data.currentCut.currentWeight);
          }
        }
      })
      .catch(() => {});
  }, [athleteId]);

  useEffect(() => { fetchAthlete(); }, [fetchAthlete]);

  // ── Session timer ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (isConnected) {
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    } else {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isConnected]);

  // ── Post-session summary + evaluation ────────────────────────────────────────

  useEffect(() => {
    if (!isDisconnected || unexpectedDisconnect || sessionDuration === 0) return;

    setShowSummary(true);
    setEvaluation(null);

    // Need enough turns for meaningful signal
    if (transcript.length < 4) return;

    // Fire both post-session Claude passes in parallel:
    // - evaluate: score deltas (blocks Done button, shows updated rating)
    // - learn: qualitative profile updates (silent, no UI change needed)
    const sessionPayload = { athleteId, transcript, mode, durationSeconds: sessionDuration };

    setEvaluating(true);

    // Profile learning runs silently — no UI dependency
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
      .then((r) => r.json() as Promise<{
        ok: boolean;
        skipped?: string;
        reasoning?: string;
        scores?: Record<string, number>;
      }>)
      .then((data) => {
        if (data.scores) {
          const vals = Object.values(data.scores);
          const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
          const newRating = Math.min(99, Math.round((avg / 10) * 99));
          setEvaluation({ newRating, reasoning: data.reasoning ?? "" });
        }
      })
      .catch(() => {})
      .finally(() => setEvaluating(false));
  }, [isDisconnected, unexpectedDisconnect, sessionDuration]);

  // ── Cleanup ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (confirmEndTimeoutRef.current) clearTimeout(confirmEndTimeoutRef.current);
      if (weightSaveTimeoutRef.current) clearTimeout(weightSaveTimeoutRef.current);
    };
  }, []);

  // ── Weight check-in ──────────────────────────────────────────────────────────

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

  // ── End session flow ─────────────────────────────────────────────────────────

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

  // ── Derived ──────────────────────────────────────────────────────────────────

  const cut = athlete?.currentCut ?? null;
  const weightRemaining = cut && currentWeight != null
    ? parseFloat((currentWeight - cut.targetWeight).toFixed(1))
    : null;
  const daysToComp = cut?.competitionDate ? daysUntil(cut.competitionDate) : null;
  const streak = athlete?.mentalPatterns?.currentStreak ?? 0;
  const mindsetRating = athlete?.mindsetTraining?.scores
    ? calcMindsetRating(athlete.mindsetTraining.scores)
    : null;

  const timerStr = `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`;
  const lastAssistantMsg = [...transcript].reverse().find((t) => t.role === "assistant");
  const assistantTurns = transcript.filter((t) => t.role === "assistant").length;
  const selectedMode = MODES.find((m) => m.value === mode)!;

  // ════════════════════════════════════════════════════════════════════════════

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden relative">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 pt-10 pb-5">
        <div>
          <p className="text-muted text-xs uppercase tracking-widest mb-0.5">IronMind</p>
          <h1 className="text-2xl font-bold text-primary leading-tight">
            {athlete?.identity.name ?? "Athlete"}
          </h1>
        </div>

        {/* Mindset Rating Badge */}
        <div className="flex items-center gap-4">
          {mindsetRating !== null && isIdle && (
            <div className="flex flex-col items-center">
              <span className={`text-4xl font-black tabular-nums leading-none ${ratingColor(mindsetRating)}`}>
                {mindsetRating}
              </span>
              <span className="text-muted text-xs uppercase tracking-widest mt-0.5">Rating</span>
            </div>
          )}
          {isConnected && (
            <span className="text-muted text-sm font-mono tabular-nums">{timerStr}</span>
          )}
          <button
            className="text-muted text-sm min-h-touch flex items-center px-1"
            onClick={() => navigate("/settings")}
          >
            Settings
          </button>
        </div>
      </div>

      {/* ── PRE-SESSION ──────────────────────────────────────────────────────── */}
      {isIdle && (
        <div className="flex-1 flex flex-col px-6 pb-6 overflow-y-auto gap-5">

          {/* Stats strip */}
          {(weightRemaining !== null || daysToComp !== null || streak > 0) && (
            <div className="flex gap-3">
              {weightRemaining !== null && (
                <div className="flex-1 bg-surface border border-border rounded-2xl px-4 py-3">
                  <p className="text-muted text-xs mb-1">To cut</p>
                  <p className="text-2xl font-bold text-primary tabular-nums">{weightRemaining}</p>
                  <p className="text-muted text-xs">lbs</p>
                </div>
              )}
              {daysToComp !== null && daysToComp >= 0 && (
                <div className="flex-1 bg-surface border border-border rounded-2xl px-4 py-3">
                  <p className="text-muted text-xs mb-1">Days out</p>
                  <p className="text-2xl font-bold text-primary tabular-nums">{daysToComp}</p>
                  <p className="text-muted text-xs">{daysToComp === 1 ? "day" : "days"}</p>
                </div>
              )}
              {streak > 0 && (
                <div className="flex-1 bg-surface border border-border rounded-2xl px-4 py-3">
                  <p className="text-muted text-xs mb-1">Streak</p>
                  <p className="text-2xl font-bold text-primary tabular-nums">{streak}</p>
                  <p className="text-muted text-xs">{streak === 1 ? "session" : "sessions"}</p>
                </div>
              )}
            </div>
          )}

          {/* Weight check-in */}
          {currentWeight !== null && (
            <div className="bg-surface border border-border rounded-2xl px-5 py-4">
              <p className="text-muted text-xs uppercase tracking-widest mb-3">Today's weight</p>
              <div className="flex items-center justify-between">
                <button
                  className="w-12 h-12 flex items-center justify-center rounded-xl border border-border text-primary text-2xl active:bg-border"
                  onClick={() => adjustWeight(-0.5)}
                >
                  −
                </button>
                <div className="text-center">
                  <span className="text-4xl font-bold text-primary tabular-nums">
                    {currentWeight.toFixed(1)}
                  </span>
                  <span className="text-muted text-sm ml-1">lbs</span>
                  {cut && (
                    <p className="text-muted text-xs mt-0.5">goal {cut.targetWeight}</p>
                  )}
                </div>
                <button
                  className="w-12 h-12 flex items-center justify-center rounded-xl border border-border text-primary text-2xl active:bg-border"
                  onClick={() => adjustWeight(0.5)}
                >
                  +
                </button>
              </div>
            </div>
          )}

          {/* Session mode selector — 2×2 grid */}
          <div>
            <p className="text-muted text-xs uppercase tracking-widest mb-3">Session Type</p>
            <div className="grid grid-cols-2 gap-2">
              {MODES.map((m) => (
                <button
                  key={m.value}
                  onClick={() => setMode(m.value)}
                  className={`flex flex-col items-start px-4 py-4 rounded-2xl border text-left transition-colors ${
                    mode === m.value
                      ? "bg-primary border-primary"
                      : "bg-surface border-border active:bg-border"
                  }`}
                >
                  <span className={`font-semibold text-sm leading-tight mb-1 ${
                    mode === m.value ? "text-background" : "text-primary"
                  }`}>
                    {m.label}
                  </span>
                  <span className={`text-xs leading-tight ${
                    mode === m.value ? "text-background opacity-60" : "text-muted"
                  }`}>
                    {m.sub}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Connect */}
          <button
            className="w-full py-5 bg-primary text-background rounded-2xl font-bold text-lg min-h-touch active:opacity-80 mt-auto"
            onClick={() => start(mode)}
          >
            {selectedMode.connectLabel}
          </button>
        </div>
      )}

      {/* ── CONNECTING ───────────────────────────────────────────────────────── */}
      {isConnecting && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 pb-10 gap-4">
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full bg-primary animate-connect-pulse"
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </div>
          <p className="text-muted text-sm">{selectedMode.label}...</p>
        </div>
      )}

      {/* ── ACTIVE SESSION ───────────────────────────────────────────────────── */}
      {isConnected && (
        <div className="flex-1 flex flex-col px-6 pb-6">

          {/* Mode label */}
          <p className="text-muted text-xs uppercase tracking-widest mb-4">
            {selectedMode.label}
          </p>

          {/* Listening ring */}
          {isListening && (
            <div className="flex items-center gap-2 mb-4">
              <div className="relative w-3 h-3">
                <div className="absolute inset-0 rounded-full bg-primary animate-listen-ring" />
                <div className="absolute inset-0 rounded-full bg-primary animate-listen-ring" style={{ animationDelay: "0.5s" }} />
                <div className="w-3 h-3 rounded-full bg-primary" />
              </div>
              <span className="text-primary text-sm font-medium">Listening</span>
            </div>
          )}

          {/* Waveform */}
          <div className="flex-1 flex items-center justify-center">
            <Waveform active={isAgentSpeaking} getVolume={getVolume} />
          </div>

          {/* Status */}
          {!isListening && (
            <p className="text-center text-muted text-xs tracking-widest uppercase mb-4">
              {isAgentSpeaking ? "IronMind" : "Connected"}
            </p>
          )}

          {/* Live caption */}
          {isAgentSpeaking && lastAssistantMsg && (
            <p className="text-center text-primary text-sm leading-relaxed max-w-xs mx-auto mb-6 animate-fade-in">
              {lastAssistantMsg.content}
            </p>
          )}

          {/* End */}
          <button
            className={`w-full py-4 rounded-2xl font-semibold text-base min-h-touch transition-all ${
              confirmingEnd
                ? "bg-danger text-primary"
                : "bg-surface border border-border text-muted active:bg-border"
            }`}
            onClick={handleEndTap}
          >
            {confirmingEnd ? "Tap again to end" : "End"}
          </button>
        </div>
      )}

      {/* ── ERROR / UNEXPECTED DISCONNECT ────────────────────────────────────── */}
      {(isError || (isDisconnected && unexpectedDisconnect)) && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 pb-10 gap-6">
          <p className="text-muted text-sm text-center">
            {isError
              ? "Couldn't connect — check your connection and try again."
              : "Session ended unexpectedly."}
          </p>
          <button
            className="w-full py-5 bg-primary text-background rounded-2xl font-bold text-lg active:opacity-80"
            onClick={() => { reset(); start(mode); }}
          >
            Reconnect
          </button>
          <button className="text-muted text-sm" onClick={reset}>Go back</button>
        </div>
      )}

      {/* ── POST-SESSION SUMMARY ─────────────────────────────────────────────── */}
      {showSummary && (
        <div className="absolute inset-x-0 bottom-0 bg-surface border-t border-border rounded-t-3xl px-6 pt-5 pb-10 animate-slide-up">
          <div className="w-10 h-1 bg-border rounded-full mx-auto mb-6" />

          <p className="text-muted text-xs uppercase tracking-widest mb-1">{selectedMode.label} complete</p>
          <div className="flex items-baseline gap-4 mb-6">
            <span className="text-5xl font-bold text-primary tabular-nums">
              {formatDuration(sessionDuration)}
            </span>
            <p className="text-muted text-sm">
              {assistantTurns} exchange{assistantTurns !== 1 ? "s" : ""}
            </p>
          </div>

          {/* Mindset rating update */}
          {evaluating && (
            <div className="flex items-center gap-2 mb-6">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full bg-muted animate-connect-pulse" style={{ animationDelay: `${i * 0.2}s` }} />
                ))}
              </div>
              <p className="text-muted text-sm">Updating mindset rating...</p>
            </div>
          )}

          {evaluation && (
            <div className="bg-background border border-border rounded-2xl px-4 py-4 mb-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-muted text-xs uppercase tracking-widest">Mindset Rating</p>
                <div className="flex items-baseline gap-1.5">
                  {mindsetRating !== null && mindsetRating !== evaluation.newRating && (
                    <span className="text-muted text-sm tabular-nums line-through">{mindsetRating}</span>
                  )}
                  <span className="text-2xl font-black text-primary tabular-nums">
                    {evaluation.newRating}
                  </span>
                </div>
              </div>
              {evaluation.reasoning && (
                <p className="text-muted text-xs leading-relaxed">{evaluation.reasoning}</p>
              )}
            </div>
          )}

          <button
            className="w-full py-5 bg-primary text-background rounded-2xl font-bold text-lg active:opacity-80 disabled:opacity-50"
            disabled={evaluating}
            onClick={() => {
              setShowSummary(false);
              setEvaluation(null);
              reset();
              fetchAthlete();
            }}
          >
            {evaluating ? "One moment..." : "Done"}
          </button>
        </div>
      )}
    </div>
  );
}
