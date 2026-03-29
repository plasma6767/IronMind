interface WaveformProps {
  active: boolean;
  barCount?: number;
}

// Visual proof the agent is alive. Animates when active, flatlines when not.
export default function Waveform({ active, barCount = 5 }: WaveformProps) {
  return (
    <div className="flex items-center gap-1.5 h-16">
      {Array.from({ length: barCount }).map((_, i) => (
        <div
          key={i}
          className={`w-1 rounded-full bg-primary transition-all duration-300 ${
            active ? "animate-waveform-pulse" : "h-1 opacity-30"
          }`}
          style={
            active
              ? {
                  animationDelay: `${i * 0.12}s`,
                  height: "100%",
                }
              : undefined
          }
        />
      ))}
    </div>
  );
}
