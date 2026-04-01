// IronMind mascot — angular geometric brain (head) with iron-bar body.
// Silver/grey metallic bars, blue glowing joints, white highlights, black accents.
// Scales cleanly from 36px (header) to 200px (landing hero).

interface MascotProps {
  width?: number;
  // When true, skips fine circuit detail so it stays crisp at tiny sizes.
  minimal?: boolean;
}

export function IronMindMascot({ width = 120, minimal = false }: MascotProps) {
  return (
    <svg
      width={width}
      viewBox="0 0 120 144"
      fill="none"
      aria-label="IronMind — brain with iron-bar body"
    >
      {/* ── BRAIN HEAD ────────────────────────────────────────────────────────── */}

      {/* Ambient glow behind brain */}
      <ellipse cx="60" cy="28" rx="32" ry="26" fill="#2563EB" opacity="0.12" />

      {/* Brain fill (dark navy) */}
      <path
        d="M60 14 L54 12 L49 7 L43 11 L34 17 L30 27 L32 37 L40 44 L60 47 L80 44 L88 37 L90 27 L86 17 L77 11 L71 7 L66 12 Z"
        fill="#060e1e"
      />

      {/* Brain outline — left hemisphere */}
      <path
        d="M60 14 L54 12 L49 7 L43 11 L34 17 L30 27 L32 37 L40 44 L60 47"
        stroke="#94A3B8"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        fill="none"
      />

      {/* Brain outline — right hemisphere */}
      <path
        d="M60 14 L66 12 L71 7 L77 11 L86 17 L90 27 L88 37 L80 44 L60 47"
        stroke="#94A3B8"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        fill="none"
      />

      {/* Top highlight on brain outline */}
      <path
        d="M49 7 L43 11 L34 17"
        stroke="rgba(255,255,255,0.3)"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M71 7 L77 11 L86 17"
        stroke="rgba(255,255,255,0.3)"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* Center divide */}
      <line
        x1="60" y1="14"
        x2="60" y2="47"
        stroke="#60A5FA"
        strokeWidth="1.5"
        opacity="0.55"
      />

      {!minimal && (
        <>
          {/* Neural circuits — left lobe */}
          <path
            d="M40 18 L33 28 L42 38"
            stroke="#60A5FA"
            strokeWidth="1.2"
            fill="none"
            opacity="0.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Neural circuits — right lobe */}
          <path
            d="M80 18 L87 28 L78 38"
            stroke="#60A5FA"
            strokeWidth="1.2"
            fill="none"
            opacity="0.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Horizontal bridge */}
          <line x1="33" y1="28" x2="87" y2="28" stroke="#60A5FA" strokeWidth="1" opacity="0.28" />
          {/* Neural nodes */}
          <circle cx="40" cy="18" r="1.5" fill="#60A5FA" opacity="0.75" />
          <circle cx="33" cy="28" r="1.5" fill="#60A5FA" opacity="0.75" />
          <circle cx="42" cy="38" r="1.5" fill="#60A5FA" opacity="0.65" />
          <circle cx="80" cy="18" r="1.5" fill="#60A5FA" opacity="0.75" />
          <circle cx="87" cy="28" r="1.5" fill="#60A5FA" opacity="0.75" />
          <circle cx="78" cy="38" r="1.5" fill="#60A5FA" opacity="0.65" />
        </>
      )}

      {/* Brain apex and base nodes (always visible) */}
      <circle cx="60" cy="7"  r="2.2" fill="#60A5FA" />
      <circle cx="60" cy="47" r="2.2" fill="#60A5FA" />

      {/* ── IRON BAR BODY ─────────────────────────────────────────────────────── */}
      {/* Each bar = silver base line + white highlight overlay + dark shadow overlay */}

      {/* — NECK — */}
      <line x1="60" y1="47" x2="60" y2="60" stroke="#7E8EA6" strokeWidth="8" strokeLinecap="round" />
      <line x1="60" y1="47" x2="60" y2="60" stroke="rgba(255,255,255,0.22)" strokeWidth="3.5" strokeLinecap="round" />
      <line x1="60" y1="56" x2="60" y2="60" stroke="rgba(0,0,0,0.25)" strokeWidth="4" strokeLinecap="round" />

      {/* — SHOULDER BAR (wide horizontal) — */}
      <line x1="14" y1="60" x2="106" y2="60" stroke="#94A3B8" strokeWidth="11" strokeLinecap="round" />
      <line x1="14" y1="55.5" x2="106" y2="55.5" stroke="rgba(255,255,255,0.32)" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="14" y1="65" x2="106" y2="65" stroke="rgba(0,0,0,0.28)" strokeWidth="2.5" strokeLinecap="round" />

      {/* — LEFT ARM — */}
      <line x1="14" y1="60" x2="6" y2="90" stroke="#7E8EA6" strokeWidth="7" strokeLinecap="round" />
      <line x1="14" y1="60" x2="6" y2="90" stroke="rgba(255,255,255,0.18)" strokeWidth="2.5" strokeLinecap="round" />

      {/* — RIGHT ARM — */}
      <line x1="106" y1="60" x2="114" y2="90" stroke="#7E8EA6" strokeWidth="7" strokeLinecap="round" />
      <line x1="106" y1="60" x2="114" y2="90" stroke="rgba(255,255,255,0.18)" strokeWidth="2.5" strokeLinecap="round" />

      {/* — LEFT FOREARM (angled inward for wrestling stance) — */}
      <line x1="6" y1="90" x2="12" y2="108" stroke="#7E8EA6" strokeWidth="6" strokeLinecap="round" />
      <line x1="6" y1="90" x2="12" y2="108" stroke="rgba(255,255,255,0.15)" strokeWidth="2" strokeLinecap="round" />

      {/* — RIGHT FOREARM — */}
      <line x1="114" y1="90" x2="108" y2="108" stroke="#7E8EA6" strokeWidth="6" strokeLinecap="round" />
      <line x1="114" y1="90" x2="108" y2="108" stroke="rgba(255,255,255,0.15)" strokeWidth="2" strokeLinecap="round" />

      {/* — TORSO — */}
      <line x1="60" y1="65" x2="60" y2="98" stroke="#7E8EA6" strokeWidth="9" strokeLinecap="round" />
      <line x1="60" y1="65" x2="60" y2="98" stroke="rgba(255,255,255,0.20)" strokeWidth="3.5" strokeLinecap="round" />
      <line x1="60" y1="92" x2="60" y2="98" stroke="rgba(0,0,0,0.22)" strokeWidth="5" strokeLinecap="round" />

      {/* — WAIST BAR (horizontal, slightly narrower than shoulder) — */}
      <line x1="30" y1="98" x2="90" y2="98" stroke="#94A3B8" strokeWidth="11" strokeLinecap="round" />
      <line x1="30" y1="93.5" x2="90" y2="93.5" stroke="rgba(255,255,255,0.32)" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="30" y1="103" x2="90" y2="103" stroke="rgba(0,0,0,0.28)" strokeWidth="2.5" strokeLinecap="round" />

      {/* — LEFT LEG — */}
      <line x1="44" y1="103" x2="30" y2="136" stroke="#7E8EA6" strokeWidth="7.5" strokeLinecap="round" />
      <line x1="44" y1="103" x2="30" y2="136" stroke="rgba(255,255,255,0.18)" strokeWidth="2.5" strokeLinecap="round" />

      {/* — RIGHT LEG — */}
      <line x1="76" y1="103" x2="90" y2="136" stroke="#7E8EA6" strokeWidth="7.5" strokeLinecap="round" />
      <line x1="76" y1="103" x2="90" y2="136" stroke="rgba(255,255,255,0.18)" strokeWidth="2.5" strokeLinecap="round" />

      {/* — LEFT FOOT BAR — */}
      <line x1="20" y1="136" x2="40" y2="136" stroke="#94A3B8" strokeWidth="6.5" strokeLinecap="round" />
      <line x1="20" y1="132.5" x2="40" y2="132.5" stroke="rgba(255,255,255,0.28)" strokeWidth="1.5" strokeLinecap="round" />

      {/* — RIGHT FOOT BAR — */}
      <line x1="80" y1="136" x2="100" y2="136" stroke="#94A3B8" strokeWidth="6.5" strokeLinecap="round" />
      <line x1="80" y1="132.5" x2="100" y2="132.5" stroke="rgba(255,255,255,0.28)" strokeWidth="1.5" strokeLinecap="round" />

      {/* ── JOINT NODES (blue glow at each junction) ─────────────────────────── */}
      {/* Neck / shoulder center */}
      <circle cx="60" cy="60" r="6"   fill="#0f1f40" />
      <circle cx="60" cy="60" r="3.8" fill="#2563EB" />
      <circle cx="60" cy="60" r="1.8" fill="#93C5FD" />

      {/* Left shoulder */}
      <circle cx="14" cy="60" r="5"   fill="#0f1f40" />
      <circle cx="14" cy="60" r="3"   fill="#2563EB" />
      <circle cx="14" cy="60" r="1.2" fill="#93C5FD" />

      {/* Right shoulder */}
      <circle cx="106" cy="60" r="5"   fill="#0f1f40" />
      <circle cx="106" cy="60" r="3"   fill="#2563EB" />
      <circle cx="106" cy="60" r="1.2" fill="#93C5FD" />

      {/* Left elbow */}
      <circle cx="6"  cy="90" r="4"   fill="#0f1f40" />
      <circle cx="6"  cy="90" r="2.5" fill="#2563EB" />

      {/* Right elbow */}
      <circle cx="114" cy="90" r="4"   fill="#0f1f40" />
      <circle cx="114" cy="90" r="2.5" fill="#2563EB" />

      {/* Left fist */}
      <circle cx="12"  cy="108" r="3.5" fill="#0f1f40" />
      <circle cx="12"  cy="108" r="2"   fill="#1D4ED8" />

      {/* Right fist */}
      <circle cx="108" cy="108" r="3.5" fill="#0f1f40" />
      <circle cx="108" cy="108" r="2"   fill="#1D4ED8" />

      {/* Waist center */}
      <circle cx="60" cy="98" r="5.5" fill="#0f1f40" />
      <circle cx="60" cy="98" r="3.5" fill="#2563EB" />
      <circle cx="60" cy="98" r="1.5" fill="#93C5FD" />

      {/* Left hip */}
      <circle cx="44" cy="103" r="4"   fill="#0f1f40" />
      <circle cx="44" cy="103" r="2.5" fill="#2563EB" />

      {/* Right hip */}
      <circle cx="76" cy="103" r="4"   fill="#0f1f40" />
      <circle cx="76" cy="103" r="2.5" fill="#2563EB" />

      {/* Left knee */}
      <circle cx="30" cy="136" r="4"   fill="#0f1f40" />
      <circle cx="30" cy="136" r="2.5" fill="#2563EB" />

      {/* Right knee */}
      <circle cx="90" cy="136" r="4"   fill="#0f1f40" />
      <circle cx="90" cy="136" r="2.5" fill="#2563EB" />
    </svg>
  );
}
