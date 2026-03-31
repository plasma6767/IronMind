import { useState, useCallback, useRef } from "react";
export function useVoice(athleteId) {
    const [state, setState] = useState({
        isPlaying: false,
        isLoading: false,
        error: null,
    });
    const audioRef = useRef(null);
    const speak = useCallback(async (text) => {
        setState({ isPlaying: false, isLoading: true, error: null });
        try {
            const res = await fetch("/api/tts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text, athleteId }),
            });
            if (!res.ok)
                throw new Error(`TTS error: ${res.status}`);
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
        }
        catch (err) {
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
