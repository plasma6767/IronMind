import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env } from "./types";
import { AthleteObject } from "./durable/AthleteObject";

// Re-export Durable Object class (required by Wrangler)
export { AthleteObject };

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
  // TODO: Phase 3 — accept { text, athleteId }, call ElevenLabs TTS with voice_model_id
  return c.json({ error: "not implemented" }, 501);
});

app.post("/voice-clone", async (c) => {
  // TODO: Phase 3 — accept audio blob, call ElevenLabs clone API, store voice_model_id
  return c.json({ error: "not implemented" }, 501);
});

// ─── Onboarding ───────────────────────────────────────────────────────────────

app.post("/onboarding/message", async (c) => {
  // TODO: Phase 7 — process onboarding conversation turn, extract data, write to DO
  return c.json({ error: "not implemented" }, 501);
});

// ─── Generate (direct Claude call — used in Phase 2 testing) ─────────────────

app.post("/generate", async (c) => {
  // TODO: Phase 2 — read DO, build prompt, call Claude via AI Gateway, return text
  return c.json({ error: "not implemented" }, 501);
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
