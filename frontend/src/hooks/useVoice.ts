import { useState, useCallback, useRef } from "react";

// TODO: Phase 3
// - POST /api/tts to get audio blob for a given text + athleteId
// - Play audio, expose isPlaying state for Waveform
// - Handle R2 cache: Worker returns cached audio or generates + caches

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

  const speak = useCallback(async (text: string) => {
    setState({ isPlaying: false, isLoading: true, error: null });

    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, athleteId }),
      });

      if (!res.ok) throw new Error(`TTS error: ${res.status}`);

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onplay = () => setState((prev) => ({ ...prev, isPlaying: true, isLoading: false }));
      audio.onended = () => {
        setState((prev) => ({ ...prev, isPlaying: false }));
        URL.revokeObjectURL(url);
      };
      audio.onerror = () => {
        setState({ isPlaying: false, isLoading: false, error: "Audio playback failed" });
        URL.revokeObjectURL(url);
      };

      await audio.play();
    } catch (err) {
      setState({ isPlaying: false, isLoading: false, error: String(err) });
    }
  }, [athleteId]);

  const stop = useCallback(() => {
    audioRef.current?.pause();
    audioRef.current = null;
    setState({ isPlaying: false, isLoading: false, error: null });
  }, []);

  return { ...state, speak, stop };
}
