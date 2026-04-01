import { useEffect, useRef } from "react";

interface WaveformProps {
  active: boolean;
  // When provided, drives bar heights directly from audio volume (0–1).
  // Animation runs via requestAnimationFrame — no React re-renders.
  getVolume?: () => number;
  barCount?: number;
}

// Waveform with two display modes:
// 1. Dynamic — driven by getVolume(), reflects actual agent audio level
// 2. CSS — animated placeholder when no volume source is available
export default function Waveform({ active, getVolume, barCount = 5 }: WaveformProps) {
  const barRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (!active || !getVolume) return;

    let rafId: number;

    const animate = () => {
      const vol = getVolume();
      barRefs.current.forEach((bar, i) => {
        if (!bar) return;
        // Each bar oscillates at a slightly different frequency for a natural look
        const phase = Date.now() / 250 + i * 0.8;
        const oscillation = 0.5 + Math.sin(phase) * 0.5;
        // Minimum 4px height; scales with volume × bar height × oscillation
        const heightPx = Math.max(4, vol * 56 * oscillation + 4);
        bar.style.height = `${heightPx}px`;
        bar.style.opacity = vol > 0.02 ? "1" : "0.3";
      });
      rafId = requestAnimationFrame(animate);
    };

    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [active, getVolume]);

  // Reset bars to resting state when inactive
  useEffect(() => {
    if (!active) {
      barRefs.current.forEach((bar) => {
        if (!bar) return;
        bar.style.height = "4px";
        bar.style.opacity = "0.3";
      });
    }
  }, [active]);

  if (!active || !getVolume) {
    // CSS animation fallback (onboarding / no volume source)
    return (
      <div className="flex items-center gap-1.5 h-16">
        {Array.from({ length: barCount }).map((_, i) => (
          <div
            key={i}
            className={`w-1 rounded-full bg-primary transition-all duration-300 ${
              active ? "animate-waveform-pulse" : "h-1 opacity-30"
            }`}
            style={active ? { animationDelay: `${i * 0.12}s`, height: "100%" } : undefined}
          />
        ))}
      </div>
    );
  }

  // Dynamic mode — bar heights driven by RAF + getVolume()
  return (
    <div className="flex items-center gap-1.5 h-16">
      {Array.from({ length: barCount }).map((_, i) => (
        <div
          key={i}
          ref={(el) => { barRefs.current[i] = el; }}
          className="w-1 rounded-full bg-primary"
          style={{ height: "4px", opacity: "0.3", transition: "opacity 0.1s" }}
        />
      ))}
    </div>
  );
}
