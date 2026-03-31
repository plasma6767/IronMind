import { useState, useEffect, useCallback, useRef } from "react";
import type { SessionState } from "../../../worker/src/types";

interface SessionData {
  sessionId: string | null;
  sessionState: SessionState;
  elapsed: number;       // seconds since session started (client-side timer)
  currentWeight: number;
  targetWeight: number;
  isActive: boolean;
}

interface ServerSessionSnapshot {
  sessionMinute: number;
  sessionState: SessionState;
  messageSeq: number;
  pendingMessage: string | null;
  currentWeight: number | null;
  targetWeight: number | null;
}

export function useSession(
  athleteId: string,
  onNewMessage: (text: string) => void
): SessionData & {
  startSession: () => Promise<void>;
  endSession: () => Promise<void>;
} {
  const [state, setState] = useState<SessionData>({
    sessionId: null,
    sessionState: "EARLY",
    elapsed: 0,
    currentWeight: 0,
    targetWeight: 0,
    isActive: false,
  });

  const lastSeqRef = useRef(0);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Keep onNewMessage stable across re-renders without re-creating poll
  const onNewMessageRef = useRef(onNewMessage);
  useEffect(() => { onNewMessageRef.current = onNewMessage; }, [onNewMessage]);

  const stopTimers = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
  }, []);

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/session/${athleteId}/current`);
      if (!res.ok) return;
      const data = await res.json() as ServerSessionSnapshot;

      setState((prev) => ({
        ...prev,
        sessionState: data.sessionState,
        currentWeight: data.currentWeight ?? prev.currentWeight,
        targetWeight: data.targetWeight ?? prev.targetWeight,
      }));

      if (data.messageSeq > lastSeqRef.current && data.pendingMessage) {
        lastSeqRef.current = data.messageSeq;
        onNewMessageRef.current(data.pendingMessage);
      }
    } catch {
      // Network hiccup — try again next tick
    }
  }, [athleteId]);

  const startSession = useCallback(async () => {
    // Abort any in-flight previous start (handles React StrictMode double-invoke)
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    // Clear any leftover timers from a cancelled start
    stopTimers();

    const res = await fetch("/api/session/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ athleteId }),
      signal: controller.signal,
    });

    // If this start was cancelled by a subsequent call, bail out
    if (controller.signal.aborted) return;
    if (!res.ok) throw new Error("Failed to start session");

    const data = await res.json() as {
      sessionId: string;
      sessionState: SessionState;
      currentWeight: number | null;
      targetWeight: number | null;
    };

    lastSeqRef.current = 0;

    setState((prev) => ({
      ...prev,
      sessionId: data.sessionId,
      sessionState: data.sessionState,
      elapsed: 0,
      currentWeight: data.currentWeight ?? prev.currentWeight,
      targetWeight: data.targetWeight ?? prev.targetWeight,
      isActive: true,
    }));

    timerRef.current = setInterval(() => {
      setState((prev) => ({ ...prev, elapsed: prev.elapsed + 1 }));
    }, 1_000);

    pollingRef.current = setInterval(poll, 3_000);
  }, [athleteId, poll, stopTimers]);

  const endSession = useCallback(async () => {
    abortRef.current?.abort();
    stopTimers();

    await fetch("/api/session/end", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ athleteId }),
    }).catch(() => {}); // best-effort — don't throw on unmount

    setState((prev) => ({ ...prev, isActive: false }));
  }, [athleteId, stopTimers]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      stopTimers();
    };
  }, [stopTimers]);

  return { ...state, startSession, endSession };
}
