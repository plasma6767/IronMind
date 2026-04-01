# Architecture

## Overview

IronMind is built on three layers: a mobile-first frontend on Cloudflare Pages, an intelligence and orchestration layer on Cloudflare Workers, and per-athlete persistent memory in Cloudflare Durable Objects.

The fundamental design constraint: every AI response must be informed by the complete history of that specific athlete. This rules out stateless AI wrappers and requires persistent, low-latency state at the edge.

---

## Custom LLM Endpoint Pattern

The most important architectural decision in the product.

ElevenLabs Conversational AI supports a custom LLM endpoint. Instead of calling Claude directly, it POSTs to the Cloudflare Worker on every conversation turn. The Worker reads the athlete's Durable Object, assembles a full context-aware system prompt, calls Claude with the full conversation history, and returns a streaming SSE response. ElevenLabs speaks the response.

```
Athlete speaks
      │
      ▼
ElevenLabs (STT → conversation history)
      │
      │  POST /llm-endpoint
      │  { messages: [...], stream: true }
      ▼
Cloudflare Worker
      │
      ├── Read athleteId from request body
      ├── Read full AthleteObject Durable Object
      ├── Build universal system prompt (cut / pre-match / reset / check-in)
      ├── Filter system-role messages (ElevenLabs sends them, Claude rejects them)
      ├── Stream Claude response as SSE
      └── Return OpenAI-compatible chat.completion.chunk format
                │
                ▼
        ElevenLabs TTS → audio → athlete
```

Without this pattern: generic AI with no memory of the athlete.
With it: every word informed by everything IronMind knows about that athlete.

---

## Auth System

Every athlete account is linked to an email address. The `athleteId` is derived deterministically from the email via SHA-256, ensuring credentials and athlete data are always consistent.

```
Signup:
  email → SHA-256 → athleteId (truncated to 32 chars)
  password → PBKDF2 (100k iterations, SHA-256, random 32-byte salt) → hash
  AuthObject stores: { email, passwordHash, salt, athleteId }
  AuthObject issues: session token (random hex)

Login:
  email → look up AuthObject → verify PBKDF2 hash → issue new session token
  Frontend stores: token + athleteId in localStorage
  App routes to /home or /onboarding based on whether DO has identity.name
```

Auth lives in a separate `AuthObject` Durable Object, keyed by email. One AuthObject per email address. One AthleteObject per athleteId (derived from email hash).

---

## Durable Object — Per-Athlete Memory

One `AthleteObject` per athlete. This is the entire memory of IronMind.

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

**Why Durable Objects:**
- Per-athlete state requires consistent identity — not eventual consistency across replicas
- Sub-100ms reads required for real-time audio generation
- No connection pooling, no latency to an external DB — runs inside Cloudflare
- Each athlete is fully isolated in their own instance

---

## Onboarding Flow

Voice conversation → Claude extraction → structured profile saved to DO.

```
New athlete signs up
      │
      ▼
Onboarding screen — ElevenLabs voice conversation
  Agent asks: name, weight class, goals, mental triggers,
              identity anchors, upcoming opponent, why this sport
      │
      ▼  (athlete taps "I'm Ready" after 8+ turns)
POST /onboarding/complete { athleteId, transcript }
      │
      ▼
Single Claude call: buildOnboardingExtractionPrompt
  Full transcript → structured JSON (all DO fields)
      │
      ▼
AthleteObject.set(profileData)
      │
      ▼
Navigate to /home
  Returning sessions: agent greets by name, context-aware from first word
```

---

## Universal Agent System Prompt

The agent is not mode-specific. One system prompt handles all contexts. Claude infers from conversation content whether the athlete needs cut support, pre-match prep, post-loss recovery, or a general check-in.

The system prompt includes:
- Full identity, goals, current cut status
- Wrestling profile, mental triggers, identity anchors
- Session history, mindset scores, streak data
- Upcoming opponent intel
- Behavioral rules for each context type

---

## Session State Machine (Cut Companion — Phase 8)

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

`avgQuitMinute` from the Durable Object drives `PRE_WALL` timing. IronMind doesn't wait for the spiral — it gets in front of it.

---

## Frontend Architecture

Cloudflare Pages hosting a Vite + React SPA. Optimized for phone use in gym environments.

**App State Machine:**
```
loading → (check localStorage + fetch profile)
    ├── no token/id → auth (show Login)
    ├── token + no profile → onboarding
    └── token + profile → home
```

**Screens:**
| Screen | Purpose |
|---|---|
| Login | Email + password sign in |
| Signup | Create account → leads to onboarding |
| Onboarding | Voice interview → Claude extraction → profile saved to DO |
| Home | Universal agent interface — connect, talk, end |
| Settings | View/edit profile, goals, opponent intel, sign out |

**Pages Function proxy:**
All `/api/*` requests are proxied to the Worker via `frontend/functions/api/[[path]].ts`. This is required because Cloudflare Pages `_redirects` with status 200 does not proxy cross-origin — it returns `index.html`.

---

## Voice Architecture

```
Athlete speaks
      │
      ▼
ElevenLabs microphone capture (browser)
      │
      ▼
ElevenLabs STT → conversation history
      │
      ▼
POST /llm-endpoint (Worker custom LLM)
      │
      ▼
Worker reads AthleteObject → builds system prompt → calls Claude (streaming)
      │
      ▼
SSE stream → ElevenLabs TTS (fallback voice or athlete's cloned voice)
      │
      ▼
Audio played in browser
```

**Signed URL flow:**
1. Frontend calls `GET /signed-url?athleteId=...`
2. Worker reads athlete DO → determines if onboarded → builds personalized first message
3. Worker fetches signed WebSocket URL from ElevenLabs API
4. Returns `{ signedUrl, firstMessage, isOnboarded }`
5. Frontend starts ElevenLabs session with `overrides: { agent: { firstMessage } }`

**Override permissions required in ElevenLabs agent Security tab:** `first_message`

---

## Audio Caching (R2)

Generated TTS audio is stored in Cloudflare R2 keyed by `tts/{voiceId}/{sha256(text)}`. If the same text is requested again for the same voice, the cached clip plays. Repeat triggers cost nothing and have zero generation latency.

---

## Security

- All API keys stored as Cloudflare Workers secrets (never in `wrangler.toml` or source)
- Passwords hashed with PBKDF2, 100k iterations, SHA-256, unique 32-byte random salt per user
- athleteId derived from email hash — not sequential, not guessable
- ElevenLabs sessions scoped per athlete via signed URLs — no cross-athlete access
- R2 audio files namespaced by athleteId + voice model
- Auth tokens are random hex strings stored in AuthObject, not JWTs
