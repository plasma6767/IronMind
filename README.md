# IronMind

**AI Mental Performance Coach for Wrestlers**

IronMind is a real-time AI mental performance coach built exclusively for wrestlers. A persistent voice agent that knows your history, understands your psychology, tracks your goals, and delivers exactly what you need to hear at the exact moment you need it.

> Built by a D1 wrestler who has lived every moment this product was designed for.

---

## What It Does

Every wrestler has a physical coach, a strength coach, and a film coach. Nobody has a mental performance coach available at 11pm on day 4 of a weight cut — one who knows their history, reads where they are right now, and actively tests and develops their mental skills in the moments when it is hardest.

IronMind is that coach.

The athlete connects via voice. The agent figures out what they need from context — weight cut support, pre-match preparation, post-loss reset, or a general check-in — and responds accordingly. No buttons to pick a mode. No menus. Just connect and talk.

---

## Four Pillars

### 1. The Cut Companion *(Hero Feature)*
A live session companion during weight cuts. The agent delivers dynamically generated messages calibrated to exactly where the athlete is — by session state, cut day, and historical quit patterns.

**Session states:** `EARLY` → `BUILDING` → `PRE_WALL` → `AT_WALL` → `BREAKTHROUGH`

### 2. Mindset Challenges *(Key Differentiator)*
At high-stress moments, the agent issues live challenges the athlete must answer out loud. Three types:
- **Pressure Test** — match scenario walk-through under physical stress
- **Identity Challenge** — counter specific voiced doubts with earned, specific responses
- **Visualization Lock** — vivid opponent visualization tested for specificity

### 3. Pre-Match Protocol
A dynamically generated pre-match ritual. Breathing → Visualization → Identity → Ignition. Built from the athlete's actual upcoming opponent intel.

### 4. The Reset Conversation
Post-loss, bad practice, mental spiral. No timer, no structure. A fully open conversation that follows a specific emotional arc: acknowledge → anchor → ground.

---

## Tech Stack

| Layer | Tool | Purpose |
|---|---|---|
| Voice layer | ElevenLabs Conversational AI | Real-time voice-to-voice with custom LLM endpoint |
| Voice cloning | ElevenLabs Voice Clone API | 30-second sample → personal voice model |
| TTS fallback | ElevenLabs TTS API | Direct audio for non-conversation turns |
| AI brain | Claude API (Anthropic) | All response generation via custom LLM endpoint |
| Edge compute | Cloudflare Workers (Hono) | Orchestration, custom LLM endpoint, session logic |
| Persistent memory | Cloudflare Durable Objects (SQLite) | Per-athlete state, history, patterns, goals |
| Auth | Cloudflare Durable Objects | Email + password credentials, session tokens |
| Audio cache | Cloudflare R2 | Stores generated clips — repeat triggers cost nothing |
| Frontend | Cloudflare Pages | Global deployment, CI/CD |

---

## Architecture Overview

ElevenLabs Conversational AI supports custom LLM endpoints. Instead of calling Claude directly, it POSTs to the Cloudflare Worker on every conversation turn. The Worker reads the athlete's Durable Object, assembles a full context-aware system prompt, calls Claude, and returns the response. ElevenLabs speaks it in the athlete's voice.

Every response is informed by the complete Durable Object history of that specific athlete. The conversation never starts from zero.

Each athlete is identified by a SHA-256 hash of their email address, linking their auth credentials to their persistent memory. Auth is handled by a separate `AuthObject` Durable Object storing PBKDF2-hashed passwords and session tokens.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full technical breakdown.

---

## Repository Structure

```
ironmind/
├── worker/                        # Cloudflare Worker — intelligence + orchestration
│   ├── src/
│   │   ├── index.ts               # Worker entry point, routing (Hono)
│   │   ├── types.ts               # Shared TypeScript interfaces
│   │   ├── durable/
│   │   │   ├── AthleteObject.ts   # Per-athlete persistent memory (SQLite DO)
│   │   │   └── AuthObject.ts      # Email/password auth + session tokens
│   │   ├── lib/
│   │   │   ├── claude.ts          # Claude API client (streaming + non-streaming)
│   │   │   ├── elevenlabs.ts      # ElevenLabs TTS + voice clone
│   │   │   └── auth.ts            # PBKDF2 password hashing
│   │   └── prompts/
│   │       └── index.ts           # System prompt assembly (universal + onboarding)
│   ├── wrangler.toml
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                      # Cloudflare Pages — mobile-first dark UI
│   ├── src/
│   │   ├── App.tsx                # Auth state machine (loading→auth→onboarding→home)
│   │   ├── screens/
│   │   │   ├── Login.tsx          # Email + password sign in
│   │   │   ├── Signup.tsx         # Account creation → onboarding
│   │   │   ├── Onboarding.tsx     # Voice interview → profile save
│   │   │   ├── Home.tsx           # Universal agent interface
│   │   │   └── Settings.tsx       # Profile + configuration
│   │   ├── hooks/
│   │   │   └── useConversation.ts # ElevenLabs SDK session management
│   │   └── components/
│   │       └── Waveform.tsx       # Animated waveform (agent speaking indicator)
│   ├── functions/
│   │   └── api/[[path]].ts        # Pages Function — proxies /api/* to Worker
│   ├── index.html
│   ├── vite.config.ts
│   └── tailwind.config.ts
│
├── ARCHITECTURE.md
├── IMPLEMENTATION.md
├── CHANGELOG.md
├── CONTRIBUTING.md
├── SECURITY.md
└── README.md
```

---

## Getting Started

### Prerequisites

- Node.js v18+
- pnpm v8+
- Wrangler CLI v3+
- Cloudflare account with Workers, Durable Objects, R2, and Pages enabled
- Anthropic API key
- ElevenLabs API key + Agent ID

### Installation

```bash
git clone https://github.com/your-org/ironmind.git
cd ironmind
pnpm install
```

### Local Development

```bash
# Run the Worker locally
pnpm --filter ironmind-worker dev

# Run the frontend dev server
pnpm --filter frontend dev
```

### Deployment

```bash
# Deploy the Worker (run first — Durable Object migrations)
pnpm --filter ironmind-worker run deploy

# Deploy the frontend
cd frontend && pnpm run deploy
```

### Required Secrets (set via `wrangler secret put`)

```
ANTHROPIC_API_KEY
ELEVENLABS_API_KEY
ELEVENLABS_AGENT_ID
ELEVENLABS_FALLBACK_VOICE_ID
```

---

## Implementation

See [IMPLEMENTATION.md](./IMPLEMENTATION.md) for the full phase-by-phase breakdown including completed work and the roadmap ahead.

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## Security

See [SECURITY.md](./SECURITY.md) for the vulnerability disclosure policy.

## License

Private — all rights reserved.
