import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Base
        background: "#000000",
        surface: "#080c18",
        "surface-2": "#0d1424",
        border: "#1a2744",
        "border-light": "#243154",
        // Text
        primary: "#f0f4ff",
        muted: "#4a5876",
        subtle: "#2a3550",
        // Blue accent — signature color
        blue: {
          DEFAULT: "#2563EB",
          light: "#60A5FA",
          lighter: "#93C5FD",
          dark: "#1D4ED8",
          deeper: "#1E3A8A",
          glow: "rgba(37,99,235,0.20)",
        },
        // Silver — metallic wrestling feel
        silver: {
          DEFAULT: "#94A3B8",
          light: "#CBD5E1",
          lighter: "#E2E8F0",
          dark: "#64748B",
        },
        // Status
        danger: "#EF4444",
        success: "#22C55E",
      },
      fontFamily: {
        sans: ["'Space Grotesk'", "Inter", "system-ui", "sans-serif"],
        mono: ["'Space Mono'", "JetBrains Mono", "monospace"],
      },
      backgroundImage: {
        "blue-gradient": "linear-gradient(135deg, #1D4ED8 0%, #2563EB 50%, #1E40AF 100%)",
        "silver-gradient": "linear-gradient(135deg, #64748B 0%, #94A3B8 50%, #CBD5E1 100%)",
        "hero-glow": "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(37,99,235,0.18) 0%, transparent 70%)",
        "card-glow": "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(37,99,235,0.08) 0%, transparent 60%)",
      },
      boxShadow: {
        "blue-sm": "0 0 12px rgba(37,99,235,0.3)",
        "blue-md": "0 0 24px rgba(37,99,235,0.4), 0 0 8px rgba(37,99,235,0.2)",
        "blue-lg": "0 0 40px rgba(37,99,235,0.5), 0 0 16px rgba(37,99,235,0.3)",
        "silver-sm": "0 0 12px rgba(148,163,184,0.2)",
        "card": "0 4px 24px rgba(0,0,0,0.6), 0 1px 0 rgba(255,255,255,0.04) inset",
      },
      animation: {
        "waveform-pulse": "waveformPulse 1.2s ease-in-out infinite",
        "connect-pulse": "connectPulse 1.5s ease-in-out infinite",
        "listen-ring": "listenRing 1.2s ease-out infinite",
        "slide-up": "slideUp 0.35s cubic-bezier(0.22,1,0.36,1) forwards",
        "fade-in": "fadeIn 0.25s ease-out forwards",
        "fade-up": "fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) forwards",
        "float": "float 4s ease-in-out infinite",
        "glow-pulse": "glowPulse 2.5s ease-in-out infinite",
        "shimmer": "shimmer 2s linear infinite",
        "scale-in": "scaleIn 0.3s cubic-bezier(0.22,1,0.36,1) forwards",
      },
      keyframes: {
        waveformPulse: {
          "0%, 100%": { transform: "scaleY(0.3)" },
          "50%": { transform: "scaleY(1)" },
        },
        connectPulse: {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.5", transform: "scale(0.95)" },
        },
        listenRing: {
          "0%": { transform: "scale(1)", opacity: "0.7" },
          "100%": { transform: "scale(2.2)", opacity: "0" },
        },
        slideUp: {
          "0%": { transform: "translateY(100%)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        glowPulse: {
          "0%, 100%": { opacity: "0.6", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.04)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.94)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
      minHeight: { touch: "48px" },
      minWidth: { touch: "48px" },
    },
  },
  plugins: [],
} satisfies Config;
