import type {
  AthleteData,
  Session,
  MentalPatterns,
  MindsetTraining,
  MindsetScores,
  SessionState,
  SessionContext,
  ActiveSession,
} from "../types";
import type { Env } from "../env";
import { buildSystemPrompt, buildCutMessagePrompt } from "../prompts/index";
import { callClaude } from "../lib/claude";

const DEFAULT_MENTAL_PATTERNS: MentalPatterns = {
  avgQuitMinute: null,
  quitTriggers: [],
  strongMinutes: [],
  breakthroughCount: 0,
  currentStreak: 0,
  longestStreak: 0,
  totalSessions: 0,
  lastComparableCutSummary: null,
};

const DEFAULT_MINDSET_SCORES: MindsetScores = {
  pressureTolerance: 5.0,
  focusControl: 5.0,
  identityStability: 5.0,
  discomfortTolerance: 5.0,
  adversityResponse: 5.0,
};

const DEFAULT_MINDSET_TRAINING: MindsetTraining = {
  challengeStreak: 0,
  scores: { ...DEFAULT_MINDSET_SCORES },
  weakestDimension: "discomfortTolerance",
  strongestDimension: "identityStability",
  challengeHistory: [],
};

// Maps challenge type to the mindset dimension it trains
const CHALLENGE_DIMENSION_MAP: Record<string, keyof MindsetScores> = {
  pressure_test: "pressureTolerance",
  identity_challenge: "identityStability",
  visualization_lock: "focusControl",
};

// Session state transitions:
// EARLY (0-5 min) → BUILDING (5-N min) → PRE_WALL (N-2 min before avg quit) → AT_WALL → BREAKTHROUGH
function deriveSessionState(
  sessionMinute: number,
  avgQuitMinute: number | null
): SessionState {
  if (sessionMinute < 5) return "EARLY";
  if (avgQuitMinute !== null) {
    if (sessionMinute >= avgQuitMinute) return "AT_WALL";
    if (sessionMinute >= avgQuitMinute - 2) return "PRE_WALL";
  }
  if (sessionMinute < 15) return "BUILDING";
  return "PRE_WALL";
}

export class AthleteObject implements DurableObject {
  private state: DurableObjectState;
  private env: Env;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    switch (url.pathname) {
      case "/get":
        return this.handleGet();
      case "/set":
        return this.handleSet(request);
      case "/session/complete":
        return this.handleSessionComplete(request);
      case "/challenge/score":
        return this.handleChallengeScore(request);
      case "/set-voice-model-id":
        return this.handleSetVoiceModelId(request);
      case "/session/start":
        return this.handleSessionStart(request);
      case "/session/end":
        return this.handleSessionEnd();
      case "/session/athlete-message":
        return this.handleAthleteMessage(request);
      case "/session/current":
        return this.handleGetCurrentSession();
      default:
        return new Response("Not found", { status: 404 });
    }
  }

  // ─── Alarm (90-second cut companion loop) ────────────────────────────────────

  async alarm(): Promise<void> {
    const session = await this.state.storage.get<ActiveSession>("activeSession");
    if (!session) return;

    const athlete = await this.getAll();
    if (!athlete) {
      await this.state.storage.delete("activeSession");
      return;
    }

    // Advance session time — each alarm tick = 90 seconds = 1.5 minutes
    session.sessionMinute = Math.round((session.sessionMinute + 1.5) * 10) / 10;
    session.sessionState = deriveSessionState(
      session.sessionMinute,
      athlete.mentalPatterns.avgQuitMinute
    );

    const ctx: SessionContext = {
      athleteId: session.athleteId,
      sessionMinute: session.sessionMinute,
      sessionState: session.sessionState,
      lastAthleteMessage: session.lastAthleteMessage,
      challengesThisSession: session.challengesThisSession,
    };

    // Generate coaching message
    const systemPrompt = buildSystemPrompt(athlete, ctx);
    const userPrompt = buildCutMessagePrompt(athlete, ctx);
    const message = await callClaude(this.env, systemPrompt, userPrompt);

    // Store for frontend to pick up via polling
    session.pendingMessage = message;
    session.messageSeq += 1;
    session.lastMessageAt = new Date().toISOString();
    session.lastAthleteMessage = null; // reset after responding

    await this.state.storage.put("activeSession", session);

    // Schedule next tick in 90 seconds
    await this.state.storage.setAlarm(Date.now() + 90_000);
  }

  // ─── Session Start ─────────────────────────────────────────────────────────

  private async handleSessionStart(request: Request): Promise<Response> {
    const { athleteId } = await request.json<{ athleteId: string }>();

    const athlete = await this.getAll();
    if (!athlete) return new Response("Athlete not found", { status: 404 });

    const session: ActiveSession = {
      sessionId: crypto.randomUUID(),
      athleteId,
      startedAt: new Date().toISOString(),
      sessionMinute: 0,
      sessionState: "EARLY",
      challengesThisSession: [],
      lastAthleteMessage: null,
      pendingMessage: null,
      messageSeq: 0,
      lastMessageAt: null,
    };

    await this.state.storage.put("activeSession", session);

    // Schedule first message in 90 seconds
    await this.state.storage.setAlarm(Date.now() + 90_000);

    return Response.json({
      sessionId: session.sessionId,
      sessionState: session.sessionState,
      sessionMinute: session.sessionMinute,
      currentWeight: athlete.currentCut?.currentWeight ?? null,
      targetWeight: athlete.currentCut?.targetWeight ?? null,
    });
  }

  // ─── Session End ───────────────────────────────────────────────────────────

  private async handleSessionEnd(): Promise<Response> {
    const session = await this.state.storage.get<ActiveSession>("activeSession");
    if (!session) return Response.json({ ok: true }); // idempotent

    const athlete = await this.getAll();
    if (athlete) {
      const record: Session = {
        id: session.sessionId,
        date: session.startedAt,
        mode: "cut",
        durationMinutes: session.sessionMinute,
        quitMinute: null,
        breakthroughSession: session.sessionState === "BREAKTHROUGH",
        sessionState: session.sessionState,
        challengesFired: session.challengesThisSession,
        challengeScores: {},
        conversationTurns: session.messageSeq,
      };
      await this.recordSession(record);
    }

    await this.state.storage.delete("activeSession");
    await this.state.storage.deleteAlarm();

    return Response.json({ ok: true });
  }

  // ─── Push-to-Talk ──────────────────────────────────────────────────────────

  private async handleAthleteMessage(request: Request): Promise<Response> {
    const { message } = await request.json<{ message: string }>();

    const session = await this.state.storage.get<ActiveSession>("activeSession");
    if (!session) return new Response("No active session", { status: 400 });

    const athlete = await this.getAll();
    if (!athlete) return new Response("Athlete not found", { status: 404 });

    const ctx: SessionContext = {
      athleteId: session.athleteId,
      sessionMinute: session.sessionMinute,
      sessionState: session.sessionState,
      lastAthleteMessage: message,
      challengesThisSession: session.challengesThisSession,
    };

    const systemPrompt = buildSystemPrompt(athlete, ctx);
    const userPrompt = buildCutMessagePrompt(athlete, ctx);
    const responseText = await callClaude(this.env, systemPrompt, userPrompt);

    // Store response so the alarm loop picks it up on next tick
    session.pendingMessage = responseText;
    session.messageSeq += 1;
    session.lastMessageAt = new Date().toISOString();
    session.lastAthleteMessage = null;
    await this.state.storage.put("activeSession", session);

    return Response.json({ message: responseText, messageSeq: session.messageSeq });
  }

  // ─── Get Current Session ──────────────────────────────────────────────────

  private async handleGetCurrentSession(): Promise<Response> {
    const session = await this.state.storage.get<ActiveSession>("activeSession");
    if (!session) return new Response("No active session", { status: 404 });

    const athlete = await this.getAll();
    return Response.json({
      ...session,
      currentWeight: athlete?.currentCut?.currentWeight ?? null,
      targetWeight: athlete?.currentCut?.targetWeight ?? null,
    });
  }

  // ─── Read ──────────────────────────────────────────────────────────────────

  private async handleGet(): Promise<Response> {
    const data = await this.getAll();
    return Response.json(data);
  }

  async getAll(): Promise<AthleteData | null> {
    return (await this.state.storage.get<AthleteData>("athlete")) ?? null;
  }

  // ─── Write ─────────────────────────────────────────────────────────────────

  private async handleSet(request: Request): Promise<Response> {
    const updates = await request.json<Partial<AthleteData>>();
    await this.update(updates);
    return Response.json({ ok: true });
  }

  async update(updates: Partial<AthleteData>): Promise<void> {
    const current = (await this.getAll()) ?? ({} as AthleteData);
    const merged: AthleteData = { ...current, ...updates };
    await this.state.storage.put("athlete", merged);
  }

  private async handleSetVoiceModelId(request: Request): Promise<Response> {
    const { voiceModelId } = await request.json<{ voiceModelId: string }>();
    await this.setVoiceModelId(voiceModelId);
    return Response.json({ ok: true });
  }

  async setVoiceModelId(voiceModelId: string): Promise<void> {
    const data = await this.getAll();
    if (!data) return;
    data.identity.voiceModelId = voiceModelId;
    await this.state.storage.put("athlete", data);
  }

  // ─── Session Completion ────────────────────────────────────────────────────

  private async handleSessionComplete(request: Request): Promise<Response> {
    const session = await request.json<Session>();
    await this.recordSession(session);
    return Response.json({ ok: true });
  }

  async recordSession(session: Session): Promise<void> {
    const data = await this.getAll();
    if (!data) return;

    data.sessions.push(session);
    data.mentalPatterns = this.derivePatterns(data.sessions);
    data.identity.lastActive = new Date().toISOString();

    await this.state.storage.put("athlete", data);
  }

  // ─── Challenge Scoring ─────────────────────────────────────────────────────

  private async handleChallengeScore(request: Request): Promise<Response> {
    const entry = await request.json<{ sessionId: string; score: number; type: string }>();
    await this.updateChallengeScore(entry);
    return Response.json({ ok: true });
  }

  async updateChallengeScore(entry: { sessionId: string; score: number; type: string }): Promise<void> {
    const data = await this.getAll();
    if (!data) return;

    const training = data.mindsetTraining ?? { ...DEFAULT_MINDSET_TRAINING };
    const dimension = CHALLENGE_DIMENSION_MAP[entry.type];

    if (dimension) {
      const current = training.scores[dimension];
      // Weighted rolling average — new score counts 20%, history counts 80%
      training.scores[dimension] = Math.round((current * 0.8 + entry.score * 0.2) * 10) / 10;
    }

    const entries = Object.entries(training.scores) as [keyof MindsetScores, number][];
    training.weakestDimension = entries.reduce((a, b) => (a[1] <= b[1] ? a : b))[0];
    training.strongestDimension = entries.reduce((a, b) => (a[1] >= b[1] ? a : b))[0];

    data.mindsetTraining = training;
    await this.state.storage.put("athlete", data);
  }

  // ─── Derived Patterns ─────────────────────────────────────────────────────

  private derivePatterns(sessions: Session[]): MentalPatterns {
    const cutSessions = sessions.filter((s) => s.mode === "cut");
    const totalSessions = cutSessions.length;

    if (totalSessions === 0) return DEFAULT_MENTAL_PATTERNS;

    const quitMinutes = cutSessions
      .filter((s) => s.quitMinute !== null)
      .map((s) => s.quitMinute as number);

    const avgQuitMinute =
      quitMinutes.length > 0
        ? Math.round((quitMinutes.reduce((a, b) => a + b, 0) / quitMinutes.length) * 10) / 10
        : null;

    const breakthroughCount = cutSessions.filter((s) => s.breakthroughSession).length;

    const reversed = [...cutSessions].reverse();
    let currentStreak = 0;
    for (const s of reversed) {
      if (s.breakthroughSession) currentStreak++;
      else break;
    }

    let longestStreak = 0;
    let runningStreak = 0;
    for (const s of cutSessions) {
      if (s.breakthroughSession) {
        runningStreak++;
        if (runningStreak > longestStreak) longestStreak = runningStreak;
      } else {
        runningStreak = 0;
      }
    }

    const strongMinuteMap: Record<number, number> = {};
    for (const s of cutSessions) {
      if (s.breakthroughSession) {
        for (let m = 1; m <= s.durationMinutes; m++) {
          strongMinuteMap[m] = (strongMinuteMap[m] ?? 0) + 1;
        }
      }
    }
    const strongMinutes = Object.entries(strongMinuteMap)
      .filter(([, count]) => count >= 2)
      .map(([minute]) => Number(minute))
      .sort((a, b) => a - b)
      .slice(0, 10);

    const quitTriggers: string[] = [];
    const quitStates = cutSessions
      .filter((s) => s.quitMinute !== null)
      .map((s) => s.sessionState);
    const stateCounts: Record<string, number> = {};
    for (const state of quitStates) {
      stateCounts[state] = (stateCounts[state] ?? 0) + 1;
    }
    for (const [state, count] of Object.entries(stateCounts)) {
      if (count >= 2) quitTriggers.push(state);
    }

    const lastBreakthrough = [...cutSessions].reverse().find((s) => s.breakthroughSession);
    const lastComparableCutSummary = lastBreakthrough
      ? `Last comparable cut on ${new Date(lastBreakthrough.date).toLocaleDateString()} — ${lastBreakthrough.durationMinutes} minutes, breakthrough session.`
      : null;

    return {
      avgQuitMinute,
      quitTriggers,
      strongMinutes,
      breakthroughCount,
      currentStreak,
      longestStreak,
      totalSessions,
      lastComparableCutSummary,
    };
  }
}
