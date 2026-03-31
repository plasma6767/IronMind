import { useState, useEffect, useCallback, useRef } from "react";
// athleteId: which DO to talk to
// onNewMessage: called whenever the DO alarm produces a new coaching message
export function useSession(athleteId, onNewMessage) {
    const [state, setState] = useState({
        sessionId: null,
        sessionState: "EARLY",
        elapsed: 0,
        currentWeight: 0,
        targetWeight: 0,
        isActive: false,
    });
    const lastSeqRef = useRef(0);
    const pollingRef = useRef(null);
    const timerRef = useRef(null);
    // Stable ref so poll closure never stales over onNewMessage identity changes
    const onNewMessageRef = useRef(onNewMessage);
    useEffect(() => { onNewMessageRef.current = onNewMessage; }, [onNewMessage]);
    const poll = useCallback(async () => {
        try {
            const res = await fetch(`/api/session/${athleteId}/current`);
            if (!res.ok)
                return;
            const data = await res.json();
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
        }
        catch {
            // Network hiccup — try again next tick
        }
    }, [athleteId]);
    const startSession = useCallback(async () => {
        const res = await fetch("/api/session/start", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ athleteId }),
        });
        if (!res.ok)
            throw new Error("Failed to start session");
        const data = await res.json();
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
        // Client-side elapsed timer — updates display every second
        timerRef.current = setInterval(() => {
            setState((prev) => ({ ...prev, elapsed: prev.elapsed + 1 }));
        }, 1_000);
        // Poll server for new alarm messages every 3 seconds
        pollingRef.current = setInterval(poll, 3_000);
    }, [athleteId, poll]);
    const endSession = useCallback(async () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
        }
        await fetch("/api/session/end", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ athleteId }),
        });
        setState((prev) => ({ ...prev, isActive: false }));
    }, [athleteId]);
    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current)
                clearInterval(timerRef.current);
            if (pollingRef.current)
                clearInterval(pollingRef.current);
        };
    }, []);
    return { ...state, startSession, endSession };
}
