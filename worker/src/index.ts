import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env, SessionContext, SessionState, AthleteData, ElevenLabsLLMRequest, ElevenLabsLLMResponse } from "./types";
import { AthleteObject } from "./durable/AthleteObject";
import { AuthObject } from "./durable/AuthObject";
import { buildSystemPrompt, buildCutMessagePrompt, buildConversationalSystemPrompt, buildOnboardingExtractionPrompt } from "./prompts/index";
import { callClaude, callClaudeWithHistory, streamClaudeWithHistory } from "./lib/claude";
import { cloneVoice, synthesizeSpeech } from "./lib/elevenlabs";

// Re-export Durable Object classes (required by Wrangler)
export { AthleteObject, AuthObject };

// Compute a hex SHA-256 digest using the Web Crypto API (available in Workers)
async function sha256Hex(text: string): Promise<string> {
  const encoded = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const app = new Hono<{ Bindings: Env }>();

app.use("*", cors());

// ─── Health ───────────────────────────────────────────────────────────────────

app.get("/", (c) => c.json({ service: "ironmind-worker", status: "ok" }));

// ─── Athlete Durable Object proxy ─────────────────────────────────────────────

function getAthleteStub(env: Env, athleteId: string): DurableObjectStub {
  const id = env.ATHLETE_DO.idFromName(athleteId);
  return env.ATHLETE_DO.get(id);
}

function getAuthStub(env: Env, email: string): DurableObjectStub {
  const id = env.AUTH_DO.idFromName(email.toLowerCase());
  return env.AUTH_DO.get(id);
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

app.post("/auth/signup", async (c) => {
  let body: { email?: string; password?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "invalid JSON body" }, 400);
  }

  if (!body.email || !body.password) {
    return c.json({ error: "email and password required" }, 400);
  }

  const stub = getAuthStub(c.env, body.email);
  const res = await stub.fetch(new Request("https://do/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: body.email, password: body.password }),
  }));
  const data = await res.json();
  return c.json(data, res.status as 200 | 409 | 400);
});

app.post("/auth/login", async (c) => {
  let body: { email?: string; password?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "invalid JSON body" }, 400);
  }

  if (!body.email || !body.password) {
    return c.json({ error: "email and password required" }, 400);
  }

  const stub = getAuthStub(c.env, body.email);
  const res = await stub.fetch(new Request("https://do/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: body.email, password: body.password }),
  }));
  const data = await res.json();
  return c.json(data, res.status as 200 | 401 | 400);
});

// Read full athlete profile
app.get("/athlete/:id", async (c) => {
  const stub = getAthleteStub(c.env, c.req.param("id"));
  const res = await stub.fetch(new Request("https://do/get"));
  const data = await res.json();
  return c.json(data);
});

// Write / update athlete fields
app.post("/athlete/:id", async (c) => {
  const body = await c.req.json();
  const stub = getAthleteStub(c.env, c.req.param("id"));
  await stub.fetch(new Request("https://do/set", {
    method: "POST",
    body: JSON.stringify(body),
  }));
  return c.json({ ok: true });
});

// ─── Session ──────────────────────────────────────────────────────────────────

app.post("/session/start", async (c) => {
  // TODO: Phase 4 — initialize session, schedule first DO alarm
  return c.json({ error: "not implemented" }, 501);
});

app.post("/session/end", async (c) => {
  // TODO: Phase 4 — finalize session, write Session record to DO
  return c.json({ error: "not implemented" }, 501);
});

app.post("/session/message", async (c) => {
  // TODO: Phase 4 — generate next cut companion message (called by DO alarm)
  return c.json({ error: "not implemented" }, 501);
});

// ─── Mindset Challenges ───────────────────────────────────────────────────────

app.post("/challenge/fire", async (c) => {
  // TODO: Phase 5 — select challenge type, generate challenge prompt
  return c.json({ error: "not implemented" }, 501);
});

app.post("/challenge/evaluate", async (c) => {
  // TODO: Phase 5 — evaluate athlete response, score, update DO
  return c.json({ error: "not implemented" }, 501);
});

// ─── Protocol ────────────────────────────────────────────────────────────────

app.post("/protocol/start", async (c) => {
  // TODO: Phase 6 — begin pre-match protocol, first phase = breathing
  return c.json({ error: "not implemented" }, 501);
});

app.post("/protocol/next", async (c) => {
  // TODO: Phase 6 — advance to next ritual phase
  return c.json({ error: "not implemented" }, 501);
});

// ─── Reset ────────────────────────────────────────────────────────────────────

app.post("/reset/message", async (c) => {
  // TODO: Phase 6 — process reset conversation turn, advance emotional arc
  return c.json({ error: "not implemented" }, 501);
});

// ─── ElevenLabs Custom LLM Endpoint ──────────────────────────────────────────
// ElevenLabs calls this on every conversation turn.
// Reads athlete DO, builds context-aware system prompt, calls Claude, returns OpenAI format.
//
// ElevenLabs appends /chat/completions to whatever base URL you configure, so
// both /llm-endpoint and /llm-endpoint/chat/completions are registered.
// athleteId defaults to "athlete-001" when not provided as a query param.

async function llmEndpointHandler(c: { req: { query: (k: string) => string | undefined; json: () => Promise<unknown> }; env: Env; json: (data: unknown, status?: number) => Response }) {
  let body: ElevenLabsLLMRequest & { athleteId?: string };
  try {
    body = await c.req.json() as ElevenLabsLLMRequest & { athleteId?: string };
  } catch {
    return c.json({ error: "invalid JSON body" }, 400);
  }

  const athleteId = body.athleteId ?? c.req.query("athleteId") ?? "athlete-001";

  if (!Array.isArray(body.messages)) {
    return c.json({ error: "messages array required" }, 400);
  }

  // Claude only accepts "user" and "assistant" roles — filter out any "system"
  // messages ElevenLabs may include in the history.
  const claudeMessages = body.messages.filter(
    (m) => m.role === "user" || m.role === "assistant"
  );

  const stub = getAthleteStub(c.env, athleteId);
  const res = await stub.fetch(new Request("https://do/get"));
  const athleteData = await res.json<AthleteData | null>();

  const isOnboarding = !athleteData?.identity?.name;
  const systemPrompt = buildConversationalSystemPrompt(isOnboarding ? null : athleteData);

  const requestBody = body as ElevenLabsLLMRequest & { stream?: boolean };

  // ElevenLabs sends stream:true — return SSE so it can start TTS immediately.
  // Fall back to plain JSON for non-streaming callers (e.g. curl tests).
  if (requestBody.stream) {
    if (claudeMessages.length === 0) {
      // No messages to respond to — send a minimal SSE response
      const encoder = new TextEncoder();
      const id = `chatcmpl-${crypto.randomUUID()}`;
      const stream = new ReadableStream({
        start(controller) {
          const chunk = { id, object: "chat.completion.chunk", model: c.env.CLAUDE_MODEL, choices: [{ index: 0, delta: { content: "Hey, I'm listening." }, finish_reason: null }] };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
          const done = { id, object: "chat.completion.chunk", model: c.env.CLAUDE_MODEL, choices: [{ index: 0, delta: {}, finish_reason: "stop" }] };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(done)}\n\n`));
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        },
      });
      return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" } });
    }

    const sseStream = streamClaudeWithHistory(c.env, systemPrompt, claudeMessages);
    return new Response(sseStream, {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
    });
  }

  // Non-streaming path
  let responseText: string;
  try {
    responseText = claudeMessages.length > 0
      ? await callClaudeWithHistory(c.env, systemPrompt, claudeMessages)
      : "Hey, I'm listening. Go ahead.";
  } catch (err) {
    console.error("Claude call failed:", err);
    return c.json({ error: `Claude error: ${String(err)}` }, 500);
  }

  return c.json({
    id: `chatcmpl-${crypto.randomUUID()}`,
    object: "chat.completion",
    model: c.env.CLAUDE_MODEL,
    choices: [{
      index: 0,
      message: { role: "assistant", content: responseText },
      finish_reason: "stop",
    }],
  } satisfies ElevenLabsLLMResponse);
}

app.post("/llm-endpoint", llmEndpointHandler);
app.post("/llm-endpoint/chat/completions", llmEndpointHandler);

// GET /signed-url?athleteId=xxx
// Returns an ElevenLabs signed conversation URL and a personalized first message.
// The first message is based on whether the athlete has a profile or not.
app.get("/signed-url", async (c) => {
  const athleteId = c.req.query("athleteId");
  if (!athleteId) return c.json({ error: "athleteId required" }, 400);

  // Read athlete profile to personalize the first message
  const stub = getAthleteStub(c.env, athleteId);
  const athleteRes = await stub.fetch(new Request("https://do/get"));
  const athleteData = await athleteRes.json<AthleteData | null>();
  const isOnboarded = !!athleteData?.identity?.name;

  const firstMessage = isOnboarded
    ? `Hey ${athleteData!.identity.name}, what's going on?`
    : "Hey, I'm IronMind — tell me your name and what you're training for.";

  const res = await fetch(
    `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${c.env.ELEVENLABS_AGENT_ID}`,
    { headers: { "xi-api-key": c.env.ELEVENLABS_API_KEY } }
  );

  if (!res.ok) {
    const text = await res.text();
    return c.json({ error: `ElevenLabs error: ${text}` }, 502);
  }

  const data = await res.json<{ signed_url: string }>();
  return c.json({ signedUrl: data.signed_url, firstMessage, isOnboarded });
});

// POST /onboarding/complete
// Called by the frontend after the onboarding conversation ends.
// Runs a Claude extraction pass on the full transcript and saves the athlete profile to DO.
app.post("/onboarding/complete", async (c) => {
  let body: { athleteId: string; transcript: Array<{ role: string; content: string }> };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "invalid JSON body" }, 400);
  }

  if (!body.athleteId || !Array.isArray(body.transcript) || body.transcript.length === 0) {
    return c.json({ error: "athleteId and transcript required" }, 400);
  }

  const transcriptText = body.transcript
    .map((m) => `${m.role === "assistant" ? "Coach" : "Athlete"}: ${m.content}`)
    .join("\n");

  // Single Claude call to extract structured profile from the full conversation
  const rawJson = await callClaude(
    c.env,
    buildOnboardingExtractionPrompt(body.athleteId),
    transcriptText,
    1500
  );

  let profileData: Partial<AthleteData>;
  try {
    profileData = JSON.parse(rawJson);
  } catch {
    return c.json({ error: "Failed to extract athlete profile from conversation — try again" }, 500);
  }

  const stub = getAthleteStub(c.env, body.athleteId);
  await stub.fetch(new Request("https://do/set", {
    method: "POST",
    body: JSON.stringify(profileData),
  }));

  return c.json({ ok: true });
});

// ─── Voice / TTS ──────────────────────────────────────────────────────────────

app.post("/tts", async (c) => {
  let body: { text?: string; athleteId?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "invalid JSON body" }, 400);
  }

  if (!body.text || !body.athleteId) {
    return c.json({ error: "text and athleteId required" }, 400);
  }

  // Resolve which voice to use: athlete's cloned voice, or fallback
  const stub = getAthleteStub(c.env, body.athleteId);
  const res = await stub.fetch(new Request("https://do/get"));
  const athleteData = await res.json<import("./types").AthleteData>();
  const voiceId = athleteData?.identity?.voiceModelId ?? c.env.ELEVENLABS_FALLBACK_VOICE_ID;

  // Build an R2 cache key: tts/{voiceId}/{sha256(text)}
  const textHash = await sha256Hex(body.text);
  const cacheKey = `tts/${voiceId}/${textHash}`;

  // Check R2 cache first
  const cached = await c.env.AUDIO_CACHE.get(cacheKey);
  if (cached) {
    const audio = await cached.arrayBuffer();
    return new Response(audio, {
      headers: { "Content-Type": "audio/mpeg", "X-Cache": "HIT" },
    });
  }

  // Cache miss — call ElevenLabs
  const audio = await synthesizeSpeech(c.env, body.text, voiceId);

  // Write to R2 before responding so the buffer isn't detached
  await c.env.AUDIO_CACHE.put(cacheKey, audio, {
    httpMetadata: { contentType: "audio/mpeg" },
  });

  return new Response(audio, {
    headers: { "Content-Type": "audio/mpeg", "X-Cache": "MISS" },
  });
});

// POST /voice-clone?athleteId=xxx
// Body: raw audio bytes (Content-Type: audio/mpeg or audio/wav)
// ElevenLabs requires at least ~30 seconds of clear speech for a good clone.
app.post("/voice-clone", async (c) => {
  const athleteId = c.req.query("athleteId");
  if (!athleteId) {
    return c.json({ error: "athleteId query param required" }, 400);
  }

  const contentType = c.req.header("Content-Type") ?? "audio/mpeg";
  const audioBuffer = await c.req.arrayBuffer();
  if (audioBuffer.byteLength === 0) {
    return c.json({ error: "audio body required" }, 400);
  }

  // Fetch athlete name for the ElevenLabs voice label
  const stub = getAthleteStub(c.env, athleteId);
  const res = await stub.fetch(new Request("https://do/get"));
  const athleteData = await res.json<import("./types").AthleteData>();
  const athleteName = athleteData?.identity?.name ?? athleteId;

  const audioBlob = new Blob([audioBuffer], { type: contentType });
  const voiceModelId = await cloneVoice(c.env, athleteName, audioBlob);

  // Store the new voice_model_id in the Durable Object
  await stub.fetch(new Request("https://do/set-voice-model-id", {
    method: "POST",
    body: JSON.stringify({ voiceModelId }),
  }));

  return c.json({ ok: true, voiceModelId });
});

// ─── Onboarding ───────────────────────────────────────────────────────────────

app.post("/onboarding/message", async (c) => {
  // TODO: Phase 7 — process onboarding conversation turn, extract data, write to DO
  return c.json({ error: "not implemented" }, 501);
});

// ─── Generate (direct Claude call — used in Phase 2 testing) ─────────────────

app.post("/generate", async (c) => {
  const body = await c.req.json<{
    athleteId: string;
    sessionState?: SessionState;
    sessionMinute?: number;
    lastAthleteMessage?: string;
  }>();

  if (!body.athleteId) {
    return c.json({ error: "athleteId required" }, 400);
  }

  // Read athlete from Durable Object
  const stub = getAthleteStub(c.env, body.athleteId);
  const res = await stub.fetch(new Request("https://do/get"));
  const athleteData = await res.json<import("./types").AthleteData>();

  if (!athleteData) {
    return c.json({ error: "athlete not found" }, 404);
  }

  const ctx: SessionContext = {
    athleteId: body.athleteId,
    sessionMinute: body.sessionMinute ?? 0,
    sessionState: body.sessionState ?? "EARLY",
    lastAthleteMessage: body.lastAthleteMessage ?? null,
    challengesThisSession: [],
  };

  const systemPrompt = buildSystemPrompt(athleteData, ctx);
  const userPrompt = buildCutMessagePrompt(athleteData, ctx);

  const message = await callClaude(c.env, systemPrompt, userPrompt);

  return c.json({ message, sessionState: ctx.sessionState, sessionMinute: ctx.sessionMinute });
});

// ─── Phase 1 Smoke Test ───────────────────────────────────────────────────────
// Seeds a full athlete object and reads it back. Remove after Phase 1 verified.

app.post("/test/seed", async (c) => {
  const athleteId = "test-athlete-001";
  const stub = getAthleteStub(c.env, athleteId);

  const testAthlete = {
    identity: {
      athleteId,
      name: "Logan Test",
      sport: "wrestling",
      weightClass: 165,
      naturalWeight: 178,
      yearsWrestling: 13,
      style: "folkstyle",
      voiceModelId: null,
      mentalArchetype: "competitor",
      createdAt: new Date().toISOString(),
      lastActive: new Date().toISOString(),
    },
    goals: {
      immediate: "Make weight at 165 for Saturday's dual",
      seasonal: "Win conference, qualify for NCAAs",
      proving: "Show I belong at this level after redshirting last year",
      identity: "Become someone who does not quit when it gets hard",
      whyThisSport: "Wrestling taught me everything about who I am. I have done this since I was 7.",
    },
    currentCut: {
      startWeight: 178.4,
      targetWeight: 165.0,
      competitionDate: new Date(Date.now() + 5 * 86400000).toISOString(),
      currentWeight: 169.2,
      lastWeighIn: new Date().toISOString(),
      cutDay: 3,
      totalCutDays: 5,
    },
    wrestlingProfile: {
      strengths: ["top pressure", "front headlock", "conditioning"],
      weaknesses: ["slow off feet", "stall when tired"],
      mentalTriggers: {
        cutSpecific: "checking scale and not being down enough",
        matchSpecific: "getting taken down first",
        practiceSpecific: "bad week before a big tournament",
      },
    },
    sessions: [],
    mentalPatterns: {
      avgQuitMinute: null,
      quitTriggers: [],
      strongMinutes: [],
      breakthroughCount: 0,
      currentStreak: 0,
      longestStreak: 0,
      totalSessions: 0,
      lastComparableCutSummary: null,
    },
    mindsetTraining: {
      challengeStreak: 0,
      scores: {
        pressureTolerance: 5.0,
        focusControl: 5.0,
        identityStability: 5.0,
        discomfortTolerance: 5.0,
        adversityResponse: 5.0,
      },
      weakestDimension: "discomfortTolerance",
      strongestDimension: "identityStability",
      challengeHistory: [],
    },
    identityAnchors: [
      "Started wrestling at age 7",
      "Cut 15 pounds for regionals freshman year and won",
      "D1 athlete — one of approximately 2 percent who made it this far",
      "Redshirted last year watching from the sideline — chose to come back",
    ],
    upcomingOpponent: {
      name: "Jake Reynolds",
      school: "App State",
      record: "18-4",
      tendencies: "Heavy double leg, slow starter, gasses after minute 4",
      lastMeetingResult: "Loss by decision at conference",
      psychologicalNotes: "Relies on physicality, struggles when pace breaks early",
    },
  };

  await stub.fetch(new Request("https://do/set", {
    method: "POST",
    body: JSON.stringify(testAthlete),
  }));

  // Read it back and return
  const res = await stub.fetch(new Request("https://do/get"));
  const saved = await res.json();

  return c.json({ seeded: true, athleteId, data: saved });
});

app.get("/test/read", async (c) => {
  const stub = getAthleteStub(c.env, "test-athlete-001");
  const res = await stub.fetch(new Request("https://do/get"));
  const data = await res.json();
  return c.json(data);
});

export default app;
