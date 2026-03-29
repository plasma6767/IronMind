import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Core palette — dark gym environment
        background: "#0a0a0a",
        surface: "#141414",
        border: "#1f1f1f",
        // Text
        primary: "#f5f5f5",
        muted: "#6b6b6b",
        // Accent — used sparingly for active states and waveform
        accent: "#e8e8e8",
        // Status indicators
        active: "#ffffff",
        danger: "#c0392b",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      animation: {
        "waveform-pulse": "waveformPulse 1.2s ease-in-out infinite",
        "mic-active": "micPulse 0.8s ease-in-out infinite",
      },
      keyframes: {
        waveformPulse: {
          "0%, 100%": { transform: "scaleY(0.3)" },
          "50%": { transform: "scaleY(1)" },
        },
        micPulse: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.4" },
        },
      },
      // Minimum touch target size for gym use
      minHeight: {
        touch: "48px",
      },
      minWidth: {
        touch: "48px",
      },
    },
  },
  plugins: [],
} satisfies Config;
