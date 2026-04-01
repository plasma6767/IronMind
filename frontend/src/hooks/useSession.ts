import { useState, useEffect, useCallback } from "react";

type SessionState = "EARLY" | "BUILDING" | "PRE_WALL" | "AT_WALL" | "BREAKTHROUGH";

interface SessionHookState {
  sessionMinute: number;
  sessionState: SessionState;
  isAgentSpeaking: boolean;
  currentWeight: number;
  targetWeight: number;
  isActive: boolean;
}

// TODO: Phase 4
// - POST /api/session/start to initialize session on the Worker
// - Poll or use SSE/WebSocket for 90-second message events
// - Play audio blobs returned from /api/tts
// - Track sessionMinute locally (increment every 60s)
// - Derive sessionState from sessionMinute + DO avgQuitMinute

export function useSession(athleteId: string): SessionHookState & {
  startSession: () => Promise<void>;
  endSession: () => Promise<void>;
} {
  const [state, setState] = useState<SessionHookState>({
    sessionMinute: 0,
    sessionState: "EARLY",
    isAgentSpeaking: false,
    currentWeight: 0,
    targetWeight: 0,
    isActive: false,
  });

  useEffect(() => {
    if (!state.isActive) return;

    const interval = setInterval(() => {
      setState((prev) => ({
        ...prev,
        sessionMinute: prev.sessionMinute + 1,
      }));
    }, 60_000);

    return () => clearInterval(interval);
  }, [state.isActive]);

  const startSession = useCallback(async () => {
    // TODO: POST /api/session/start
    setState((prev) => ({ ...prev, isActive: true }));
  }, []);

  const endSession = useCallback(async () => {
    // TODO: POST /api/session/end
    setState((prev) => ({ ...prev, isActive: false }));
  }, []);

  return { ...state, startSession, endSession };
}
