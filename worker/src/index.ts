import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env, SessionContext, SessionState } from "./types";
import { AthleteObject } from "./durable/AthleteObject";
import { buildSystemPrompt, buildCutMessagePrompt } from "./prompts/index";
import { callClaude } from "./lib/claude";
import { cloneVoice, synthesizeSpeech } from "./lib/elevenlabs";

// Re-export Durable Object class (required by Wrangler)
export { AthleteObject };

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

app.post("/llm-endpoint", async (c) => {
  // TODO: Phase 6 — receive ElevenLabs request, read DO, call Claude, return response
  // This is the critical endpoint: ElevenLabs → Worker → DO → Claude → ElevenLabs
  return c.json({ error: "not implemented" }, 501);
});

// ─── Voice / TTS ──────────────────────────────────────────────────────────────

app.post("/tts", async (c) => {
  const body = await c.req.json<{ text: string; athleteId: string }>();

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

  // Store in R2 (fire-and-forget — don't block the response)
  c.executionCtx.waitUntil(
    c.env.AUDIO_CACHE.put(cacheKey, audio.slice(0), {
      httpMetadata: { contentType: "audio/mpeg" },
    })
  );

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
