# Implementation Plan

Build in this sequence. Each phase ends with something testable.

---

## Phase 1 — Foundation (Durable Object + Worker Skeleton)

**Goal:** Can read and write athlete data. All routes exist, nothing crashes.

- [ ] Run `wrangler init` inside `/worker`, configure `wrangler.toml` bindings (DO, R2, AI Gateway)
- [ ] Define all TypeScript interfaces in `worker/src/types.ts` (full schema: identity, goals, currentCut, wrestlingProfile, sessions, mentalPatterns, mindsetTraining, identityAnchors, upcomingOpponent)
- [ ] Implement `AthleteObject` Durable Object in `worker/src/durable/AthleteObject.ts`
  - `get(field)` / `set(field, value)` / `getAll()` methods
  - Typed accessors for each schema section
- [ ] Wire Worker entry point (`worker/src/index.ts`) — route all requests to stub handlers returning `501`
- [ ] **Smoke test:** create an athlete, write every DO field, read it all back, verify shape

---

## Phase 2 — AI Brain (Claude via AI Gateway)

**Goal:** Worker reads athlete context, builds a prompt, gets a real Claude response back.

- [ ] Create AI Gateway in Cloudflare dashboard — copy gateway URL into Worker secrets
- [ ] Build prompt assembly in `worker/src/prompts/index.ts`
  - System prompt template (all dynamic fields from DO)
  - Cut companion message prompt
  - Goal layer selection logic (session state → goal field)
- [ ] Implement `POST /generate` route — reads DO → assembles prompt → calls Claude via AI Gateway → returns text
- [ ] **Smoke test:** hit `/generate` with a seeded athlete Durable Object, verify Claude response references athlete-specific data (name, weight, goals)

---

## Phase 3 — Voice Layer (ElevenLabs Clone + TTS)

**Goal:** Athlete records a sample. The agent speaks back in their own voice.

- [ ] Implement `POST /onboarding/voice-clone` — accept audio blob → call ElevenLabs Voice Clone API → store `voice_model_id` in DO under `identity.voiceModelId`
- [ ] Implement fallback: if clone fails, store preset voice ID, retry clone in background
- [ ] Implement `POST /tts` — accept `{ text, athleteId }` → read `voice_model_id` from DO → call ElevenLabs TTS → return audio stream
- [ ] Wire R2 audio cache — hash prompt text → R2 key, check before generating, write after
- [ ] **Smoke test:** record 30s sample, verify ElevenLabs voice model created, play first cloned audio message

---

## Phase 4 — Cut Companion (Core Product)

**Goal:** Full cut session end-to-end. 90-second loop, state machine, push-to-talk response.

- [ ] Implement session state machine in `worker/src/routes/session.ts`
  - State transitions: `EARLY → BUILDING → PRE_WALL → AT_WALL → BREAKTHROUGH`
  - PRE_WALL detection: `sessionMinute >= (avgQuitMinute - 2)`
  - State-to-goal-layer mapping
- [ ] Implement Durable Object alarm for 90-second message loop
  - On alarm: calculate state → assemble prompt → call Claude → cache + play audio → reschedule
- [ ] Add push-to-talk handling: athlete input interrupts the loop, agent replies directly, session continues
- [ ] Update DO `sessions[]` and `mentalPatterns` at end of session
- [ ] Build `CutSession` screen — session timer, waveform, current weight display
- [ ] Build `PushToTalk` component — hold to speak, release to send, active listening animation
- [ ] Wire frontend ↔ `/session/start`, `/session/end` Worker routes
- [ ] **Smoke test:** run a full session through all state transitions, verify messages match state, verify push-to-talk response is contextual

---

## Phase 5 — Mindset Challenges

**Goal:** Three challenge types fire at correct states, evaluate athlete response, update scores.

- [ ] Implement challenge selection logic — `weakestDimension` from DO drives which type fires
- [ ] Implement Pressure Test prompt + evaluation in `worker/src/routes/challenge.ts`
  - Scenario built from `wrestlingProfile.mentalTriggers`
  - Evaluate: specific + process-oriented (strong) vs. vague + outcome-focused (needs coaching)
- [ ] Implement Identity Challenge prompt + evaluation
  - Voice a specific doubt from current cut data
  - Evaluate: earned + specific vs. hollow positivity
- [ ] Implement Visualization Lock prompt + evaluation
  - Build scenario from `upcomingOpponent` intel
  - 3 specificity test questions — push back if answers are vague
- [ ] Wire evaluation → score (1–10) → DO update (`challengeScores`, `mindsetTraining.scores`)
- [ ] Update `mindsetTraining.weakestDimension` and `strongestDimension` after scoring
- [ ] **Smoke test:** fire each challenge type against a seeded athlete, verify pushback logic on a vague answer, verify DO scores updated correctly

---

## Phase 6 — Protocol + Reset + Custom LLM Endpoint

**Goal:** All four pillars working. ElevenLabs Conversational AI wired to the Worker.

- [ ] Implement Pre-Match Protocol in `worker/src/routes/protocol.ts`
  - Phase sequence: `breathing → visualization → identity_reinforcement → ignition`
  - Visualization built from `upcomingOpponent` intel — specific HOW, not just "you win"
  - Ignition: 20 words max
  - Push-to-talk interrupt: address athlete input completely, then continue phase
- [ ] Implement Reset Conversation in `worker/src/routes/reset.ts`
  - Emotional arc state machine: `acknowledge → anchor → ground`
  - Do not advance arc until current phase is complete
  - Always pull from `goals.whyThisSport` in anchor/ground phases
  - No length limit, no timer
- [ ] Implement `POST /llm-endpoint` in `worker/src/routes/llm-endpoint.ts`
  - Accept ElevenLabs Conversational AI request format (`{ messages, conversation_history }`)
  - Extract `athlete_id` from session context
  - Read full DO → assemble context prompt → call Claude → return in ElevenLabs expected JSON format
- [ ] Configure ElevenLabs Conversational AI agent to point at `https://<worker-url>/llm-endpoint`
- [ ] **Smoke test Protocol:** verify all 4 phases play, test push-to-talk interruption mid-phase
- [ ] **Smoke test Reset:** verify emotional arc, verify `whyThisSport` is referenced, verify no rushing to positivity
- [ ] **Smoke test LLM endpoint:** ElevenLabs calls Worker, Worker calls Claude with full DO context, response plays in cloned voice

---

## Phase 7 — Conversational Onboarding

**Goal:** Voice interview populates the Durable Object. First experience feels like meeting a coach.

- [ ] Implement onboarding system prompt in `worker/src/routes/onboarding.ts`
  - Separate onboarding-mode prompt (not production mode prompt)
  - Conversational tone — questions, not form fields
- [ ] Implement 6-step onboarding sequence with DO writes after each section
  - Step 1: Basic profile → `identity` fields
  - Step 2: Goals intake → `goals` object
  - Step 3: Mental profile → `wrestlingProfile` + `mentalArchetype`
  - Step 4: Identity anchors → `identityAnchors[]` (5+ specific career moments)
  - Step 5: Voice clone recording → `voiceModelId`
  - Step 6: Current cut → `currentCut` object
- [ ] Implement mental archetype determination (3 archetype questions → `competitor | craftsman | warrior`)
- [ ] Implement structured data extraction: parse natural speech → typed DO fields
- [ ] Build `Onboarding` screen — waveform, push-to-talk, step progress indicator
- [ ] **Smoke test:** complete full onboarding flow, verify all DO fields populated correctly

---

## Phase 8 — Frontend Polish + Deploy

**Goal:** Looks intentional on a phone screen. Deployed to production. Tested on device.

- [ ] Consistent dark theme across all screens — `#0a0a0a` background, high-contrast text
- [ ] Waveform animation activates when agent is speaking (Web Audio API or CSS animation driven by audio state)
- [ ] Microphone icon clearly shows active listening state during push-to-talk
- [ ] Weight and weight remaining always visible during cut sessions
- [ ] All touch targets large enough for one-thumb gym use (min 48px)
- [ ] `Dashboard` screen — weight remaining, days to competition, mode entry buttons
- [ ] `Protocol` screen — ritual phase indicator, opponent name visible
- [ ] `Reset` screen — waveform + push-to-talk only, nothing else
- [ ] `Settings` screen — weight update, competition date, opponent intel entry
- [ ] Deploy Worker: `pnpm --filter worker deploy`
- [ ] Deploy frontend: `pnpm --filter frontend deploy` (Cloudflare Pages)
- [ ] Verify AI Gateway dashboard shows live logs and cache hits
- [ ] Full end-to-end test on a real mobile device
