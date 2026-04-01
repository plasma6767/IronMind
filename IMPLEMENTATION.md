# Implementation Plan

Build in this sequence. Each phase ends with something testable.

---

## Phase 1 — Foundation ✅ COMPLETE

**Goal:** Can read and write athlete data. All routes exist, nothing crashes.

- [x] Configure `wrangler.toml` bindings (DO, R2)
- [x] Define all TypeScript interfaces in `worker/src/types.ts` (full schema: identity, goals, currentCut, wrestlingProfile, sessions, mentalPatterns, mindsetTraining, identityAnchors, upcomingOpponent)
- [x] Implement `AthleteObject` Durable Object — get/set/getAll over SQLite storage
- [x] Wire Worker entry point (`worker/src/index.ts`) with Hono routing
- [x] Smoke test: seed full athlete object, read back, verify shape

---

## Phase 2 — AI Brain ✅ COMPLETE

**Goal:** Worker reads athlete context, builds a prompt, gets a real Claude response back.

- [x] Build `worker/src/lib/claude.ts` — `callClaude()`, `callClaudeWithHistory()`, `streamClaudeWithHistory()`
- [x] Build prompt assembly in `worker/src/prompts/index.ts`
- [x] Implement `POST /generate` route — reads DO → assembles prompt → calls Claude → returns text
- [x] Smoke test: hit `/generate` with seeded athlete, verify Claude response references athlete-specific data

---

## Phase 3 — Voice Layer ✅ COMPLETE

**Goal:** Athlete can record a sample. The agent speaks back in their own voice.

- [x] Implement `POST /voice-clone` — accept audio blob → call ElevenLabs Voice Clone API → store `voiceModelId` in DO
- [x] Implement `POST /tts` — accept `{ text, athleteId }` → read voice model from DO → call ElevenLabs TTS → return audio
- [x] Wire R2 audio cache — SHA-256 hash of text → R2 key, check before generating, write after
- [x] Smoke test: verify voice model created, play first cloned audio

---

## Phase 4 — ElevenLabs Conversational AI + Universal Agent ✅ COMPLETE

**Goal:** Real-time voice conversation with full athlete context on every turn. One interface, agent figures out mode from context.

- [x] Implement `POST /llm-endpoint` and `POST /llm-endpoint/chat/completions` (ElevenLabs appends `/chat/completions`)
  - Reads athleteId from request body (`customLlmExtraBody`)
  - Reads full Durable Object, builds context-aware universal system prompt
  - Filters system-role messages (ElevenLabs sends them, Claude rejects them)
  - Returns SSE streaming response when `stream: true` (required by ElevenLabs)
  - Falls back to plain JSON for non-streaming callers
- [x] Implement `GET /signed-url` — returns ElevenLabs signed WebSocket URL + personalized first message
- [x] Implement `POST /onboarding/complete` — Claude extraction pass on full transcript → save structured profile to DO
- [x] Build universal system prompt (`buildConversationalSystemPrompt`) — single agent handles cut, pre-match, reset, check-in based on conversation context
- [x] Build onboarding extraction prompt (`buildOnboardingExtractionPrompt`) — converts natural speech transcript to typed DO fields
- [x] Build `Home.tsx` — single connect/end interface, waveform, elapsed timer, athlete name + cut info
- [x] Build `Onboarding.tsx` — voice interview, "I'm ready" after 8+ turns, saves profile, routes to home
- [x] Build `functions/api/[[path]].ts` — Cloudflare Pages Function proxying `/api/*` to Worker
- [x] Configure ElevenLabs agent: custom LLM URL, `first_message` override enabled in Security tab
- [x] Smoke test: full onboarding conversation → profile saves to DO → returning session greets by name

---

## Phase 5 — Auth System ✅ COMPLETE

**Goal:** Email + password account system. Every athlete's data is linked to their account.

- [x] Implement `worker/src/lib/auth.ts` — PBKDF2 password hashing (Web Crypto API, 100k iterations, SHA-256), token generation
- [x] Implement `worker/src/durable/AuthObject.ts`
  - `POST /signup` — hashes password, derives athleteId from SHA-256(email), stores credentials
  - `POST /login` — verifies password, issues session token
  - Returns 409 on duplicate email, 401 on bad credentials
- [x] Wire `POST /auth/signup` and `POST /auth/login` routes in Worker
- [x] Add `AUTH_DO` binding and v2 migration to `wrangler.toml`
- [x] Build `Login.tsx` — email + password, error messages, "Create an account" link
- [x] Build `Signup.tsx` — email + password + confirm, leads into onboarding
- [x] Update `App.tsx` — state machine: `loading → auth → onboarding → home`
  - Checks localStorage for token + athleteId on mount
  - `onAuth()` fetches profile to determine routing
- [x] Smoke test: signup → onboarding → profile saves → login → home (no re-onboarding)

---

## Phase 6 — UI Polish + Engagement Features ✅ COMPLETE

**Goal:** The app feels intentional, not minimal. Small features that add real value.

### Visual Polish
- [x] Live transcript — last agent message shown as caption while agent is speaking
- [x] Dynamic waveform — bar heights driven by `getOutputVolume()` via `requestAnimationFrame` (zero React re-renders during animation)
- [x] Pulse animation on Connect button while connecting (`animate-connect-pulse`)
- [x] Listening ring — pulsing rings animate around a dot when agent is in listening mode
- [x] Post-session summary card — slides up after intentional end (duration + exchange count)
- [x] New tailwind animations: `connect-pulse`, `listen-ring`, `slide-up`, `fade-in`

### Home Screen Additions
- [x] Weight check-in — `+/- 0.5lb` buttons, debounced save via `PATCH /athlete/:id/weight`
- [x] Days until competition countdown (derived from `currentCut.competitionDate`)
- [x] Session streak display — "N days in a row" (derived from `mentalPatterns.currentStreak`)
- [x] Mood tap before session — Struggling / Neutral / Locked In, passes `mood` to `/signed-url` which personalizes the first message

### Quality of Life
- [x] Reconnect button when session drops unexpectedly (distinct from intentional end)
- [x] End session confirmation — tap once for "Tap again to end", second tap within 3 seconds ends
- [x] Error state shows actionable message ("check your connection and try again")
- [x] `reset()` cleanly returns to idle state from any terminal status

### Backend additions
- [x] `PATCH /athlete/:id/weight` — deep-merges new weight into `currentCut`, updates `lastWeighIn`
- [x] `GET /signed-url` mood param — `struggling` / `locked_in` / `neutral` each produce a different opening line

---

## Phase 7 — Settings Screen

**Goal:** Athlete can view and edit their profile without re-doing full onboarding.

- [ ] Display saved profile: name, weight class, natural weight, wrestling style, archetype
- [ ] Display current goals (immediate, seasonal, proving, identity, why)
- [ ] Edit upcoming opponent — name, school, record, tendencies, psychological notes
- [ ] Edit current cut — target weight, competition date, current weight
- [ ] Option to redo full onboarding (clear profile + restart)
- [ ] Sign out button — clears localStorage, returns to login

---

## Phase 8 — Cut Companion (Core Proactive Mode)

**Goal:** Agent proactively checks in during a weight cut on a timed loop without the athlete initiating.

- [ ] Implement session state machine — `EARLY → BUILDING → PRE_WALL → AT_WALL → BREAKTHROUGH`
  - `PRE_WALL` detection: fires 2 minutes before `avgQuitMinute`
  - State-to-goal-layer mapping
- [ ] Implement Durable Object alarm for periodic message delivery
- [ ] Update DO `sessions[]` and `mentalPatterns` at end of session
- [ ] Smoke test: run through all state transitions, verify messages match state

---

## Phase 9 — Mindset Challenges

**Goal:** Three challenge types fire at correct session states, evaluate athlete response, update scores.

- [ ] Challenge selection logic — `weakestDimension` from DO drives type
- [ ] Pressure Test — scenario from `wrestlingProfile.mentalTriggers`, evaluate specificity
- [ ] Identity Challenge — voice a specific doubt, evaluate earned vs. hollow response
- [ ] Visualization Lock — built from `upcomingOpponent`, 3 specificity test questions
- [ ] Wire evaluation → score (1–10) → DO update (`challengeScores`, `mindsetTraining.scores`)
- [ ] Update `weakestDimension` / `strongestDimension` after scoring
- [ ] Smoke test: fire each type, verify pushback on vague answer, verify DO scores updated

---

## Phase 10 — Pre-Match Protocol + Reset

**Goal:** Dedicated structured modes for match prep and post-loss recovery.

- [ ] Pre-Match Protocol — `breathing → visualization → identity_reinforcement → ignition`
  - Visualization built from `upcomingOpponent` intel
  - Ignition: 20 words max
- [ ] Reset Conversation — emotional arc: `acknowledge → anchor → ground`
  - Always pull from `goals.whyThisSport` in anchor/ground phases
  - No advancing arc until current phase is complete
- [ ] Smoke test Protocol: all 4 phases, test interruption mid-phase
- [ ] Smoke test Reset: verify arc, verify `whyThisSport` referenced, no rushing to positivity
