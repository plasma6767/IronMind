import { useNavigate } from "react-router-dom";
import { IronMindMascot } from "../components/Mascot";

// ─── Inline SVG icons ─────────────────────────────────────────────────────────

function BoltIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M9 1.5L3.5 9H8L7 14.5L12.5 7H8L9 1.5Z" fill="currentColor" />
    </svg>
  );
}

function BrainIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M8 2 C6 2 4 3.5 4 5.5 C4 7 4.8 8.2 6 8.8 L6 14 L10 14 L10 8.8 C11.2 8.2 12 7 12 5.5 C12 3.5 10 2 8 2Z" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinejoin="round" />
      <line x1="8" y1="2" x2="8" y2="14" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      <path d="M4 6 Q6 5.5 8 6" stroke="currentColor" strokeWidth="1" fill="none" opacity="0.6" />
      <path d="M12 6 Q10 5.5 8 6" stroke="currentColor" strokeWidth="1" fill="none" opacity="0.6" />
    </svg>
  );
}

function TargetIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3" />
      <line x1="8" y1="1" x2="8" y2="4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <line x1="8" y1="12" x2="8" y2="15" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <line x1="1" y1="8" x2="4" y2="8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <line x1="12" y1="8" x2="15" y2="8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

// ─── Feature chip ─────────────────────────────────────────────────────────────

function FeatureChip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-border-light bg-surface-2 text-silver-light text-sm font-medium tracking-wide">
      <span className="text-blue-light">{icon}</span>
      <span>{label}</span>
    </div>
  );
}

// ─── Stat pill — quick credibility numbers ────────────────────────────────────

function StatPill({ number, label }: { number: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-2xl font-black text-primary tracking-tight">{number}</span>
      <span className="text-muted text-xs font-medium tracking-wide uppercase">{label}</span>
    </div>
  );
}

// ─── Landing Page ─────────────────────────────────────────────────────────────

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="relative flex flex-col min-h-full bg-background bg-grid overflow-hidden">

      {/* Background radial glow */}
      <div
        aria-hidden
        className="absolute top-0 left-0 right-0 h-[70%] pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 55% at 50% 30%, rgba(37,99,235,0.16) 0%, transparent 70%)",
        }}
      />

      {/* ── Top nav ── */}
      <div className="relative z-10 flex items-center justify-between px-6 pt-10">
        <div className="flex items-center gap-2.5">
          <IronMindMascot width={28} minimal />
          <span className="text-primary font-bold text-sm tracking-widest uppercase">
            IronMind
          </span>
        </div>
        <button
          className="text-silver text-sm font-medium px-4 py-2 rounded-xl border border-border hover:border-border-light hover:text-primary transition-colors"
          onClick={() => navigate("/login")}
        >
          Sign In
        </button>
      </div>

      {/* ── Hero ── */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 pt-6 pb-4 text-center gap-7">

        {/* Mascot */}
        <div className="animate-float">
          <div className="animate-glow-pulse drop-shadow-[0_0_32px_rgba(37,99,235,0.45)]">
            <IronMindMascot width={164} />
          </div>
        </div>

        {/* Headline */}
        <div className="flex flex-col gap-3 max-w-sm animate-fade-up">
          <h1 className="text-[2.4rem] font-black leading-[1.08] tracking-tight text-primary">
            The mental edge{" "}
            <span className="text-shimmer">built for wrestlers.</span>
          </h1>
          <p className="text-silver text-base leading-relaxed font-medium">
            AI coaching that knows your cut, your competition, and
            exactly what breaks you — so nothing does.
          </p>
        </div>

        {/* Stats row */}
        <div
          className="flex items-center justify-center gap-8 animate-fade-up"
          style={{ animationDelay: "0.08s" }}
        >
          <StatPill number="4" label="Session modes" />
          <div className="w-px h-8 bg-border" />
          <StatPill number="5" label="Mindset dims." />
          <div className="w-px h-8 bg-border" />
          <StatPill number="24/7" label="Available" />
        </div>

        {/* Feature chips */}
        <div
          className="flex flex-wrap justify-center gap-2 animate-fade-up"
          style={{ animationDelay: "0.14s" }}
        >
          <FeatureChip icon={<BoltIcon />} label="Adapts to you" />
          <FeatureChip icon={<BrainIcon />} label="Trains your mindset" />
          <FeatureChip icon={<TargetIcon />} label="Speaks wrestling" />
        </div>

        {/* CTA */}
        <div
          className="flex flex-col items-center gap-4 w-full max-w-sm animate-fade-up"
          style={{ animationDelay: "0.2s" }}
        >
          <button
            className="w-full py-4 rounded-2xl font-bold text-lg text-white shadow-blue-md active:scale-[0.98] transition-transform"
            style={{
              background:
                "linear-gradient(135deg, #1D4ED8 0%, #2563EB 60%, #1E40AF 100%)",
            }}
            onClick={() => navigate("/signup")}
          >
            Get Your Edge — Free
          </button>
          <button
            className="text-silver text-sm font-medium"
            onClick={() => navigate("/login")}
          >
            Already a member?{" "}
            <span className="text-blue-light underline underline-offset-2">
              Sign in
            </span>
          </button>
        </div>
      </div>

      {/* ── Bottom badge ── */}
      <div className="relative z-10 flex justify-center pb-8 pt-2">
        <p className="text-subtle text-xs font-medium tracking-wide">
          Powered by Claude · Built on Cloudflare
        </p>
      </div>
    </div>
  );
}
