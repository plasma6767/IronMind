# Architecture

## Overview

IronMind is built on a three-layer architecture: a mobile-first frontend on Cloudflare Pages, an intelligence and orchestration layer on Cloudflare Workers, and per-athlete persistent memory in Cloudflare Durable Objects.

The fundamental design constraint is this: every AI response must be informed by the complete history of that specific athlete. This rules out stateless AI wrappers and requires persistent, low-latency state at the edge.

---

## Data Flow — Every 90 Seconds (Cut Session)

```
Worker session timer fires (t=90s)
        │
        ▼
Read Athlete Durable Object
  - session state, weight, cut day
  - quit history, goals, identity anchors
  - mindset scores, challenge history
        │
        ▼
Calculate session state
  EARLY → BUILDING → PRE_WALL → AT_WALL → BREAKTHROUGH
        │
        ▼
Decision: deliver message OR fire mindset challenge
  (driven by sessionState + weakestDimension)
        │
        ▼
Assemble full context prompt
  (Worker builds dynamically from DO fields)
        │
        ▼
Call Claude via Cloudflare AI Gateway
        │
        ├── Standard message → ElevenLabs TTS → Audio → Browser
        │
        └── Challenge → Agent speaks → Wait for push-to-talk
                          │
                          ▼
                      Evaluate response
                      Coach the gap
                          │
                          ▼
                      Update DO (score, assessment, patterns)
```

---

## Custom LLM Endpoint Pattern

The most important architectural decision in the product.

ElevenLabs Conversational AI supports plugging in a custom LLM endpoint. By default, ElevenLabs calls Claude directly — with zero knowledge of the athlete. IronMind replaces that direct connection with a Cloudflare Worker URL.

```
ElevenLabs Conversational AI
        │
        │  POST /llm-endpoint
        │  { transcript, conversation_history }
        ▼
Cloudflare Worker
        │
        ├── Read full Durable Object (athlete context)
        ├── Select mode prompt (cut / protocol / reset / onboarding)
        ├── Assemble complete context-aware prompt
        ├── Call Claude via AI Gateway
        └── Return response in ElevenLabs expected JSON format
                │
                ▼
        ElevenLabs speaks response
        in athlete's cloned voice
```

Without this pattern: generic AI with no memory.
With it: every word informed by everything IronMind knows about this athlete.

---

## Durable Object — Per-Athlete Memory

One Durable Object per athlete. This is the entire memory of IronMind.

```
AthleteObject
├── identity          — name, weight class, natural weight, archetype, voice model ID
├── goals             — immediate, seasonal, proving, identity, whyThisSport
├── currentCut        — start/target/current weight, competition date, cut day
├── wrestlingProfile  — strengths, weaknesses, mental triggers
├── sessions[]        — full session history with quit points, challenge scores
├── mentalPatterns    — derived: avg quit minute, triggers, streaks, breakthrough count
├── mindsetTraining   — per-dimension scores, challenge history, weakest dimension
├── identityAnchors[] — specific career moments (not traits — events)
└── upcomingOpponent  — name, school, record, tendencies, psychological notes
```

**Why Durable Objects specifically:**
- Per-athlete state requires consistent identity — not eventual consistency across replicas
- Sub-100ms reads required for real-time audio generation
- Stateful session logic (90-second timer, session state machine) needs a single authoritative location
- No other serverless primitive solves both consistent identity and low-latency simultaneously

---

## Session State Machine

```
EARLY (minutes 1–8)
  │ Calm, affirming, competitive — seasonal goal
  ▼
BUILDING (minutes 9 to wall-3)
  │ Sharpening focus — proving goal
  ▼
PRE_WALL (2 min before historical quit point)
  │ Get in front of the spiral — identity goal, direct
  ▼
AT_WALL (at or past historical quit point)
  │ Identity only — why they wrestle, nothing else
  ▼
BREAKTHROUGH (past wall, still going)
    Acknowledge what they just did — fuel the finish
```

`avgQuitMinute` from the Durable Object drives `PRE_WALL` timing. IronMind doesn't wait for the athlete to start spiraling — it gets in front of it.

---

## Prompt Assembly

Prompts are never static. The Worker assembles them dynamically before every Claude call by reading live Durable Object fields.

```typescript
// Conceptual structure — see worker/src/prompts/index.ts for full implementation
buildPrompt(athleteData: AthleteObject, mode: Mode, context: SessionContext) {
  // System prompt: identity, goals, history, rules
  // Mode-specific prompt: current moment context
  // Goal selection: driven by sessionState
  // Challenge context: weakestDimension, previous challenges this session
}
```

**Goal layer selection:**
| State | Goal Layer Used |
|---|---|
| EARLY / BUILDING | `goals.seasonal` |
| PRE_WALL | `goals.proving` |
| AT_WALL / BREAKTHROUGH | `goals.identity` |
| Reset | `goals.whyThisSport` (always) |

---

## Voice Architecture

```
Athlete speaks → Push-to-talk button
                        │
                        ▼
              ElevenLabs microphone capture
                        │
                        ▼
              ElevenLabs speech-to-text
                        │
                        ▼
              Worker LLM endpoint (full DO context)
                        │
                        ▼
              Claude generates response text
                        │
                        ▼
              ElevenLabs TTS (athlete's voice model ID)
                        │
                        ▼
              Audio played in browser
```

**Voice cloning:**
1. Onboarding agent prompts 30-second natural speech recording
2. Sample sent to ElevenLabs Voice Clone API → returns `voice_model_id`
3. `voice_model_id` stored in `identity.voiceModelId` on Durable Object
4. All subsequent TTS calls pass `voice_model_id`
5. Fallback: warm preset voice if cloning fails; retry in background

---

## Cloudflare AI Gateway

All Claude calls route through Cloudflare AI Gateway. Benefits:
- **Caching**: Repeat prompts (same session state, similar context) return cached responses — critical for demo reliability
- **Logging**: Full request/response log for every AI call — debugging and performance analysis
- **Rate limit protection**: Gateway absorbs spikes, prevents API key exhaustion during demos
- **Observability**: Dashboard shows latency, cache hit rate, token usage

---

## Audio Caching (R2)

Generated audio clips are stored in Cloudflare R2. If the same message is triggered again (same session state, same context hash), the cached clip plays instead of re-generating. Repeat triggers cost nothing. Eliminates latency on common message patterns.

---

## Frontend Architecture

Cloudflare Pages hosting a Vite + React SPA. Optimized for phone use in gym environments:

- Dark background throughout (low-light gym environments)
- Large touch targets (one-thumb operation)
- Waveform animation activates when agent is speaking
- Current weight and weight remaining always visible during cut sessions
- One screen does one thing — no dashboard clutter

**Screens:**
| Screen | Purpose |
|---|---|
| Onboarding | Multi-step voice interview, DO population |
| Dashboard | Cut status, mode entry points |
| Cut Session | 90s timer, waveform, weight display, push-to-talk |
| Protocol | Ritual phase indicator, opponent name, push-to-talk |
| Reset | Waveform + push-to-talk only — private space feel |
| Settings | Weight update, competition date, opponent intel |

---

## Security Considerations

- All API keys stored as Cloudflare Workers secrets (never in `wrangler.toml`)
- Durable Object IDs derived from authenticated user session — no enumeration possible
- ElevenLabs Conversational AI sessions scoped per athlete — no cross-athlete data access
- R2 audio files namespaced by `athleteId` — no direct URL guessing
- AI Gateway provides an additional layer of rate limiting before Claude API
