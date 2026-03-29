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

export default app;
