import { useState, useCallback, useRef } from "react";

interface VoiceHookState {
  isPlaying: boolean;
  isLoading: boolean;
  error: string | null;
}

export function useVoice(athleteId: string) {
  const [state, setState] = useState<VoiceHookState>({
    isPlaying: false,
    isLoading: false,
    error: null,
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const unlockedRef = useRef(false);

  // Call synchronously inside a user gesture to unlock autoplay
  const unlockAudio = useCallback(() => {
    if (unlockedRef.current) return;
    unlockedRef.current = true;
    // Warm up with a silent play so the browser grants autoplay permission
    const a = new Audio();
    a.src = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";
    a.play().catch(() => {});
  }, []);

  const speak = useCallback(async (text: string) => {
    setState({ isPlaying: false, isLoading: true, error: null });

    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, athleteId }),
      });

      if (!res.ok) throw new Error(`TTS failed: ${res.status}`);

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      // Stop anything currently playing
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onplay = () => setState((prev) => ({ ...prev, isPlaying: true, isLoading: false }));
      audio.onended = () => {
        setState((prev) => ({ ...prev, isPlaying: false }));
        URL.revokeObjectURL(url);
      };
      audio.onerror = (e) => {
        console.error("Audio playback error:", e);
        setState({ isPlaying: false, isLoading: false, error: "Audio playback failed" });
        URL.revokeObjectURL(url);
      };

      await audio.play();
    } catch (err) {
      console.error("speak() error:", err);
      setState({ isPlaying: false, isLoading: false, error: String(err) });
    }
  }, [athleteId]);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setState({ isPlaying: false, isLoading: false, error: null });
  }, []);

  return { ...state, speak, stop, unlockAudio };
}
