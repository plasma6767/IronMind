import type { AthleteData, Identity, Goals, CurrentCut, WrestlingProfile, Session, MentalPatterns, MindsetTraining, UpcomingOpponent } from "../types";

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

const DEFAULT_MINDSET_TRAINING: MindsetTraining = {
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
};

export class AthleteObject implements DurableObject {
  private state: DurableObjectState;

  constructor(state: DurableObjectState) {
    this.state = state;
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
      default:
        return new Response("Not found", { status: 404 });
    }
  }

  // ─── Read ──────────────────────────────────────────────────────────────────

  private async handleGet(): Promise<Response> {
    const data = await this.getAll();
    return Response.json(data);
  }

  async getAll(): Promise<AthleteData | null> {
    return (await this.state.storage.get<AthleteData>("athlete")) ?? null;
  }

  async getIdentity(): Promise<Identity | null> {
    const data = await this.getAll();
    return data?.identity ?? null;
  }

  async getGoals(): Promise<Goals | null> {
    const data = await this.getAll();
    return data?.goals ?? null;
  }

  async getCurrentCut(): Promise<CurrentCut | null> {
    const data = await this.getAll();
    return data?.currentCut ?? null;
  }

  async getMentalPatterns(): Promise<MentalPatterns> {
    const data = await this.getAll();
    return data?.mentalPatterns ?? DEFAULT_MENTAL_PATTERNS;
  }

  async getMindsetTraining(): Promise<MindsetTraining> {
    const data = await this.getAll();
    return data?.mindsetTraining ?? DEFAULT_MINDSET_TRAINING;
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
    // TODO: update mindsetTraining.scores based on challenge type and score
    // Recalculate weakestDimension and strongestDimension
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
        ? quitMinutes.reduce((a, b) => a + b, 0) / quitMinutes.length
        : null;

    const breakthroughCount = cutSessions.filter((s) => s.breakthroughSession).length;

    // TODO: calculate currentStreak, longestStreak, strongMinutes, quitTriggers
    // TODO: generate lastComparableCutSummary narrative

    return {
      avgQuitMinute,
      quitTriggers: [],
      strongMinutes: [],
      breakthroughCount,
      currentStreak: 0,
      longestStreak: 0,
      totalSessions,
      lastComparableCutSummary: null,
    };
  }
}
