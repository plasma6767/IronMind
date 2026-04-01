import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env, AthleteData, ElevenLabsLLMRequest, ElevenLabsLLMResponse, ConversationMode } from "./types";
import { AthleteObject } from "./durable/AthleteObject";
import { AuthObject } from "./durable/AuthObject";
import { buildConversationalSystemPrompt, buildOnboardingExtractionPrompt, buildSessionEvaluationPrompt, buildProfileLearningPrompt } from "./prompts/index";
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

// Reset athlete profile — clears all stored athlete data so the athlete re-onboards.
// Auth credentials are preserved; only the Durable Object profile is wiped.
app.post("/athlete/:id/reset", async (c) => {
  const stub = getAthleteStub(c.env, c.req.param("id"));
  await stub.fetch(new Request("https://do/reset", { method: "POST" }));
  return c.json({ ok: true });
});

// Patch current weight — merges into currentCut rather than replacing it
app.patch("/athlete/:id/weight", async (c) => {
  let body: { currentWeight?: number };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "invalid JSON body" }, 400);
  }

  if (typeof body.currentWeight !== "number") {
    return c.json({ error: "currentWeight (number) required" }, 400);
  }

  const stub = getAthleteStub(c.env, c.req.param("id"));
  const res = await stub.fetch(new Request("https://do/get"));
  const data = await res.json<AthleteData | null>();

  if (!data?.currentCut) {
    return c.json({ error: "no active cut on this athlete" }, 404);
  }

  const updated: Partial<AthleteData> = {
    currentCut: {
      ...data.currentCut,
      currentWeight: body.currentWeight,
      lastWeighIn: new Date().toISOString(),
    },
  };

  await stub.fetch(new Request("https://do/set", {
    method: "POST",
    body: JSON.stringify(updated),
  }));

  return c.json({ ok: true });
});

// ─── Session ──────────────────────────────────────────────────────────────────

// POST /session/evaluate
// Called by the frontend after every session ends.
// Sends the full transcript to Claude for mindset signal extraction,
// then applies small score deltas to the athlete's mindsetTraining scores.
app.post("/session/evaluate", async (c) => {
  let body: {
    athleteId: string;
    transcript: Array<{ role: string; content: string }>;
    mode: ConversationMode;
    durationSeconds: number;
  };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "invalid JSON body" }, 400);
  }

  // Need at least a few exchanges to have meaningful signal
  if (!body.athleteId || !Array.isArray(body.transcript) || body.transcript.length < 4) {
    return c.json({ ok: true, skipped: "insufficient transcript length" });
  }

  const stub = getAthleteStub(c.env, body.athleteId);
  const res = await stub.fetch(new Request("https://do/get"));
  const athleteData = await res.json<AthleteData | null>();

  if (!athleteData?.mindsetTraining) {
    return c.json({ ok: true, skipped: "no athlete data" });
  }

  const durationMinutes = Math.max(1, Math.round(body.durationSeconds / 60));
  const systemPrompt = buildSessionEvaluationPrompt(athleteData, body.mode, durationMinutes);

  const transcriptText = body.transcript
    .map((m) => `${m.role === "assistant" ? "IronMind" : "Athlete"}: ${m.content}`)
    .join("\n");

  let rawJson: string;
  try {
    rawJson = await callClaude(c.env, systemPrompt, transcriptText, 300);
  } catch (err) {
    console.error("Session evaluation Claude call failed:", err);
    return c.json({ ok: true, skipped: "claude error" });
  }

  const cleaned = rawJson
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();

  let deltas: Record<string, number>;
  try {
    deltas = JSON.parse(cleaned);
  } catch {
    console.error("Session evaluation parse failed:", rawJson);
    return c.json({ ok: true, skipped: "parse error" });
  }

  // Apply deltas via AthleteObject — returns updated scores
  const evalRes = await stub.fetch(new Request("https://do/session/evaluate", {
    method: "POST",
    body: JSON.stringify(deltas),
  }));
  const { scores } = await evalRes.json<{ ok: boolean; scores: Record<string, number> }>();

  return c.json({
    ok: true,
    reasoning: typeof deltas.reasoning === "string" ? deltas.reasoning : null,
    scores,
  });
});

// POST /session/learn
// Called after every session. Sends the transcript to Claude to extract
// qualitative profile updates (identity anchors, goal refinements, mental
// triggers, strengths/weaknesses) and merges them into the athlete's DO.
// Runs independently of /session/evaluate — both fire in parallel from the client.
app.post("/session/learn", async (c) => {
  let body: {
    athleteId: string;
    transcript: Array<{ role: string; content: string }>;
  };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "invalid JSON body" }, 400);
  }

  // Need at least a few exchanges to extract anything meaningful
  if (!body.athleteId || !Array.isArray(body.transcript) || body.transcript.length < 4) {
    return c.json({ ok: true, skipped: "insufficient transcript length" });
  }

  const stub = getAthleteStub(c.env, body.athleteId);
  const res = await stub.fetch(new Request("https://do/get"));
  const athleteData = await res.json<AthleteData | null>();

  if (!athleteData?.identity?.name) {
    return c.json({ ok: true, skipped: "no athlete data" });
  }

  const systemPrompt = buildProfileLearningPrompt(
    athleteData,
    body.transcript as Array<{ role: "user" | "assistant"; content: string }>
  );

  let rawJson: string;
  try {
    rawJson = await callClaude(c.env, systemPrompt, "", 500);
  } catch (err) {
    console.error("[session/learn] Claude call failed:", err);
    return c.json({ ok: true, skipped: "claude error" });
  }

  const cleaned = rawJson
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();

  let updates: unknown;
  try {
    updates = JSON.parse(cleaned);
  } catch {
    console.error("[session/learn] Parse failed:", rawJson);
    return c.json({ ok: true, skipped: "parse error" });
  }

  await stub.fetch(new Request("https://do/profile-learn", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  }));

  return c.json({ ok: true });
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
  const res = await stub.fetch(new Request("https://do/get-with-mode"));
  const { athlete: athleteData, sessionMode } = await res.json<{ athlete: AthleteData | null; sessionMode: ConversationMode | null }>();

  const isOnboarding = !athleteData?.identity?.name;
  const systemPrompt = buildConversationalSystemPrompt(
    isOnboarding ? null : athleteData,
    sessionMode ?? undefined
  );

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

  const mode = c.req.query("mode") as ConversationMode | undefined;

  // Persist the selected mode in its own storage key (separate from athlete profile)
  if (mode && isOnboarded) {
    await stub.fetch(new Request("https://do/set-session-mode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode }),
    }));
  }

  let firstMessage: string;
  if (!isOnboarded) {
    firstMessage = "Hey, I'm IronMind — tell me your name and what you're training for.";
  } else {
    const name = athleteData!.identity.name;
    switch (mode) {
      case "workout":
        firstMessage = `${name} — what are we training today?`;
        break;
      case "prematch":
        firstMessage = `Let's get you locked in, ${name}. Who are you competing against?`;
        break;
      case "postmatch":
        firstMessage = `${name}, how did it go?`;
        break;
      default:
        firstMessage = `Hey ${name}, what's going on?`;
    }
  }

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

  // Claude sometimes wraps JSON in markdown fences despite instructions — strip them
  const cleanedJson = rawJson
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();

  let profileData: Partial<AthleteData>;
  try {
    profileData = JSON.parse(cleanedJson);
  } catch (parseErr) {
    console.error("JSON parse failed. Raw Claude output:", rawJson, "Error:", parseErr);
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


export default app;
