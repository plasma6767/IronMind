import { useState, useCallback, useRef } from "react";
import { Conversation } from "@11labs/client";
import type { Mode, Status } from "@11labs/client";

export type ConversationStatus = Status | "idle" | "error";
export type ConversationMode = "workout" | "general" | "prematch" | "postmatch";

export interface TranscriptEntry {
  role: "user" | "assistant";
  content: string;
}

interface UseConversationReturn {
  status: ConversationStatus;
  agentMode: Mode | null;
  transcript: TranscriptEntry[];
  getVolume: () => number;
  sessionDuration: number;
  unexpectedDisconnect: boolean;
  start: (mode?: ConversationMode) => Promise<void>;
  end: () => Promise<void>;
  reset: () => void;
}

export function useConversation(athleteId: string): UseConversationReturn {
  const [status, setStatus] = useState<ConversationStatus>("idle");
  const [agentMode, setAgentMode] = useState<Mode | null>(null);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [unexpectedDisconnect, setUnexpectedDisconnect] = useState(false);

  const conversationRef = useRef<Conversation | null>(null);
  const sessionStartRef = useRef<number | null>(null);
  const intentionalEndRef = useRef(false);

  const getVolume = useCallback((): number => {
    return conversationRef.current?.getOutputVolume() ?? 0;
  }, []);

  const start = useCallback(async (mode?: ConversationMode) => {
    if (conversationRef.current) return;

    setStatus("connecting");
    setTranscript([]);
    setSessionDuration(0);
    setUnexpectedDisconnect(false);
    intentionalEndRef.current = false;

    try {
      const params = new URLSearchParams({ athleteId });
      if (mode) params.set("mode", mode);

      const res = await fetch(`/api/signed-url?${params}`);
      if (!res.ok) throw new Error(`Signed URL request failed: ${res.status}`);
      const { signedUrl, firstMessage } = (await res.json()) as { signedUrl: string; firstMessage: string };

      const conversation = await Conversation.startSession({
        signedUrl,
        overrides: { agent: { firstMessage } },
        onConnect: () => {
          sessionStartRef.current = Date.now();
          setStatus("connected");
        },
        onDisconnect: () => {
          const duration = sessionStartRef.current
            ? Math.floor((Date.now() - sessionStartRef.current) / 1000)
            : 0;
          setSessionDuration(duration);
          setUnexpectedDisconnect(!intentionalEndRef.current);
          setStatus("disconnected");
          setAgentMode(null);
          conversationRef.current = null;
          sessionStartRef.current = null;
        },
        onMessage: ({ message, source }) => {
          setTranscript((prev) => [
            ...prev,
            { role: source === "ai" ? "assistant" : "user", content: message },
          ]);
        },
        onModeChange: ({ mode }) => {
          setAgentMode(mode);
        },
        onStatusChange: ({ status: s }) => {
          setStatus(s);
        },
        onError: (message, context) => {
          console.error("[IronMind] Error:", message, context);
          setStatus("error");
        },
      });

      conversationRef.current = conversation;
    } catch (err) {
      console.error("[IronMind] Failed to start:", err);
      setStatus("error");
    }
  }, [athleteId]);

  const end = useCallback(async () => {
    if (!conversationRef.current) return;
    intentionalEndRef.current = true;
    await conversationRef.current.endSession();
  }, []);

  const reset = useCallback(() => {
    setStatus("idle");
    setTranscript([]);
    setSessionDuration(0);
    setUnexpectedDisconnect(false);
  }, []);

  return { status, agentMode, transcript, getVolume, sessionDuration, unexpectedDisconnect, start, end, reset };
}
