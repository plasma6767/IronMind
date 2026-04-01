import { useState, useCallback, useRef } from "react";
import { Conversation } from "@11labs/client";
import type { Mode, Status } from "@11labs/client";

export type ConversationStatus = Status | "idle" | "error";

export interface TranscriptEntry {
  role: "user" | "assistant";
  content: string;
}

interface UseConversationReturn {
  status: ConversationStatus;
  agentMode: Mode | null;
  transcript: TranscriptEntry[];
  start: () => Promise<void>;
  end: () => Promise<void>;
}

export function useConversation(athleteId: string): UseConversationReturn {
  const [status, setStatus] = useState<ConversationStatus>("idle");
  const [agentMode, setAgentMode] = useState<Mode | null>(null);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const conversationRef = useRef<Conversation | null>(null);

  const start = useCallback(async () => {
    if (conversationRef.current) return; // already active

    setStatus("connecting");
    setTranscript([]);

    try {
      console.log("[IronMind] Fetching signed URL for", athleteId);
      const res = await fetch(`/api/signed-url?athleteId=${encodeURIComponent(athleteId)}`);
      console.log("[IronMind] Signed URL response status:", res.status);
      if (!res.ok) throw new Error(`Signed URL request failed: ${res.status}`);
      const { signedUrl, firstMessage } = (await res.json()) as { signedUrl: string; firstMessage: string };
      console.log("[IronMind] Got signed URL, firstMessage:", firstMessage);

      const conversation = await Conversation.startSession({
        signedUrl,
        overrides: { agent: { firstMessage } },
        onConnect: () => {
          console.log("[IronMind] Connected");
          setStatus("connected");
        },
        onDisconnect: (details) => {
          console.log("[IronMind] Disconnected:", JSON.stringify(details));
          setStatus("disconnected");
          setAgentMode(null);
          conversationRef.current = null;
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
          console.log("[IronMind] Status change:", s);
          setStatus(s);
        },
        onError: (message, context) => {
          console.error("[IronMind] ElevenLabs error:", message, context);
          setStatus("error");
        },
      });

      conversationRef.current = conversation;
    } catch (err) {
      console.error("Failed to start conversation:", err);
      setStatus("error");
    }
  }, [athleteId]);

  const end = useCallback(async () => {
    if (!conversationRef.current) return;
    await conversationRef.current.endSession();
    conversationRef.current = null;
  }, []);

  return { status, agentMode, transcript, start, end };
}
