import { useState, useRef, useCallback } from "react";

interface PushToTalkProps {
  onSpeech: (transcript: string) => void;
  disabled?: boolean;
}

// Tap and hold to speak. Release to send. Zero false triggers.
export default function PushToTalk({ onSpeech, disabled = false }: PushToTalkProps) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const startListening = useCallback(() => {
    if (disabled) return;

    type SpeechRecognitionCtor = typeof SpeechRecognition;
    const SpeechRecognitionCtor: SpeechRecognitionCtor | undefined =
      window.SpeechRecognition ?? window.webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      console.warn("SpeechRecognition not available");
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = (e: SpeechRecognitionEvent) => {
      const transcript = e.results[0]?.[0]?.transcript ?? "";
      if (transcript) onSpeech(transcript);
    };

    recognition.onerror = (e: SpeechRecognitionErrorEvent) => console.error("Speech recognition error:", e.error);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [disabled, onSpeech]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsListening(false);
  }, []);

  return (
    <button
      className={`
        w-20 h-20 rounded-full border-2 flex items-center justify-center
        transition-all duration-150 select-none
        ${isListening
          ? "bg-primary border-primary scale-95"
          : "bg-transparent border-border active:scale-95"
        }
        ${disabled ? "opacity-30 pointer-events-none" : ""}
      `}
      onPointerDown={startListening}
      onPointerUp={stopListening}
      onPointerLeave={stopListening}
      aria-label={isListening ? "Listening — release to send" : "Hold to speak"}
    >
      <MicIcon active={isListening} />
    </button>
  );
}

function MicIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={active ? "text-background animate-mic-active" : "text-primary"}
    >
      <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" x2="12" y1="19" y2="22" />
    </svg>
  );
}
