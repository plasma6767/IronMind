# IronMind

**AI Mental Performance Coach for Wrestlers**

IronMind is a real-time AI mental performance coach built exclusively for wrestlers. A persistent voice agent that knows your history, understands your psychology, tracks your goals across four emotional layers, and delivers exactly what you need to hear at the exact moment you need it — in your own cloned voice.

> Built by a D1 wrestler who has lived every moment this product was designed for.

---

## What It Does

Every wrestler has a physical coach, a strength coach, and a film coach. Nobody has a mental performance coach available at 11pm on day 4 of a weight cut — one who knows their history, reads where they are right now, speaks in their own voice, and actively tests and develops their mental skills in the moments when it is hardest.

IronMind is that coach.

---

## Four Pillars

### 1. The Cut Companion *(Hero Feature)*
A live session companion during weight cuts. Every 90 seconds the agent fades in with a dynamically generated 10–15 second message calibrated to exactly where the athlete is — by session state, cut day, and historical quit patterns. Push-to-talk activates at any time for direct response.

**Session states:** `EARLY` → `BUILDING` → `PRE_WALL` → `AT_WALL` → `BREAKTHROUGH`

### 2. Mindset Challenges *(Key Differentiator)*
At `PRE_WALL` and late-session states, the agent issues live challenges the athlete must answer out loud. Three types:
- **Pressure Test** — match scenario walk-through under physical stress
- **Identity Challenge** — counter specific voiced doubts with earned, specific responses
- **Visualization Lock** — vivid opponent visualization tested for specificity

### 3. Pre-Match Protocol
A 5-minute dynamically generated pre-match ritual in the athlete's cloned voice. Breathing → Visualization → Identity → Ignition. Athlete can interrupt at any phase.

### 4. The Reset Conversation
Post-loss, bad practice, mental spiral. No music, no timer, no structure. A fully open conversation that follows a specific emotional arc: acknowledge → anchor → ground.

---

## Tech Stack

| Layer | Tool | Purpose |
|---|---|---|
| Voice layer | ElevenLabs Conversational AI | Real-time voice-to-voice with custom LLM endpoint |
| Voice cloning | ElevenLabs Voice Clone API | 30-second sample → personal voice model |
| TTS fallback | ElevenLabs TTS API | Direct audio for non-conversation turns |
| AI brain | Claude API (Anthropic) | All script and response generation |
| Edge compute | Cloudflare Workers | Orchestration, custom LLM endpoint, session logic |
| Persistent memory | Cloudflare Durable Objects | Per-athlete state, history, patterns, goals |
| API proxy | Cloudflare AI Gateway | Caching, logging, rate-limit protection |
| Audio cache | Cloudflare R2 | Stores generated clips — repeat triggers cost nothing |
| Frontend | Cloudflare Pages | Global deployment, CI/CD |

---

## Architecture Overview

The critical architectural decision: ElevenLabs Conversational AI supports custom LLM endpoints. Instead of calling Claude directly, it POSTs to the Cloudflare Worker URL. The Worker reads the Durable Object, assembles a full context-aware prompt, calls Claude through AI Gateway, and returns the response. ElevenLabs speaks it in the athlete's cloned voice.

Every response — in any mode, at any moment — is informed by the complete Durable Object history of that athlete. The conversation never starts from zero.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full technical breakdown.

---

## Repository Structure

```
ironmind/
├── worker/                   # Cloudflare Worker — intelligence + orchestration layer
│   ├── src/
│   │   ├── index.ts          # Worker entry point + routing
│   │   ├── types.ts          # Shared TypeScript types (Durable Object schema)
│   │   ├── durable/
│   │   │   └── AthleteObject.ts   # Durable Object — per-athlete persistent memory
│   │   ├── prompts/
│   │   │   └── index.ts      # Claude prompt assembly (all four modes)
│   │   └── routes/
│   │       ├── llm-endpoint.ts    # Custom LLM endpoint for ElevenLabs
│   │       ├── session.ts         # Cut session logic + 90s timer
│   │       ├── challenge.ts       # Mindset challenge evaluation
│   │       ├── protocol.ts        # Pre-match protocol
│   │       ├── reset.ts           # Reset conversation handler
│   │       └── onboarding.ts      # Voice onboarding + DO population
│   ├── wrangler.toml
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                 # Cloudflare Pages — mobile-first dark UI
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── screens/
│   │   │   ├── Onboarding.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── CutSession.tsx
│   │   │   ├── Protocol.tsx
│   │   │   ├── Reset.tsx
│   │   │   └── Settings.tsx
│   │   ├── components/
│   │   │   ├── Waveform.tsx
│   │   │   ├── PushToTalk.tsx
│   │   │   └── WeightDisplay.tsx
│   │   └── hooks/
│   │       ├── useSession.ts
│   │       └── useVoice.ts
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   └── package.json
│
├── .github/
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md
│   │   └── feature_request.md
│   └── PULL_REQUEST_TEMPLATE.md
│
├── .env.example
├── .gitignore
├── ARCHITECTURE.md
├── CHANGELOG.md
├── CONTRIBUTING.md
├── SECURITY.md
└── README.md
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [pnpm](https://pnpm.io/) v8+
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) v3+
- Cloudflare account with Workers, Durable Objects, R2, AI Gateway, and Pages enabled
- Anthropic API key
- ElevenLabs API key

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/ironmind.git
cd ironmind

# Install all dependencies
pnpm install

# Copy environment variables
cp .env.example .env
# Fill in your API keys and Cloudflare config
```

### Local Development

```bash
# Run the Worker locally (with Durable Objects + R2 emulated)
pnpm --filter worker dev

# Run the frontend dev server
pnpm --filter frontend dev
```

### Deployment

```bash
# Deploy the Worker
pnpm --filter worker deploy

# Deploy the frontend to Cloudflare Pages
pnpm --filter frontend deploy
```

---

## Environment Variables

See [`.env.example`](./.env.example) for the full list of required configuration values.

---

## Implementation

The project is broken into 8 sequential phases, each ending with something testable. See [IMPLEMENTATION.md](./IMPLEMENTATION.md) for the full task breakdown.

**Phases at a glance:**
1. Foundation — Durable Object schema + Worker skeleton
2. AI Brain — Claude integration via AI Gateway
3. Voice Layer — ElevenLabs voice clone + TTS + R2 audio cache
4. Cut Companion — 90-second loop, session state machine, push-to-talk
5. Mindset Challenges — three challenge types, evaluation logic, scoring
6. Protocol + Reset + custom LLM endpoint — all four pillars live
7. Conversational Onboarding — voice interview populates the Durable Object
8. Frontend Polish + Deploy — production deploy, mobile test

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## Security

See [SECURITY.md](./SECURITY.md) for the vulnerability disclosure policy.

## License

Private — all rights reserved.
