import type { AthleteData, Session, MentalPatterns, MindsetTraining, MindsetScores } from "../types";

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
    const data = await this.getAll();
    if (!data) return;

    const training = data.mindsetTraining ?? { ...DEFAULT_MINDSET_TRAINING };
    const dimension = CHALLENGE_DIMENSION_MAP[entry.type];

    if (dimension) {
      const current = training.scores[dimension];
      // Weighted rolling average — new score counts 20%, history counts 80%
      // This prevents a single session from swinging the score wildly
      training.scores[dimension] = Math.round((current * 0.8 + entry.score * 0.2) * 10) / 10;
    }

    // Recalculate weakest and strongest dimensions
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

    // Average quit minute (only sessions where they actually quit)
    const quitMinutes = cutSessions
      .filter((s) => s.quitMinute !== null)
      .map((s) => s.quitMinute as number);

    const avgQuitMinute =
      quitMinutes.length > 0
        ? Math.round((quitMinutes.reduce((a, b) => a + b, 0) / quitMinutes.length) * 10) / 10
        : null;

    // Breakthrough count
    const breakthroughCount = cutSessions.filter((s) => s.breakthroughSession).length;

    // Current streak — consecutive sessions ending in breakthrough (most recent first)
    const reversed = [...cutSessions].reverse();
    let currentStreak = 0;
    for (const s of reversed) {
      if (s.breakthroughSession) {
        currentStreak++;
      } else {
        break;
      }
    }

    // Longest streak ever
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

    // Strong minutes — minutes that appear frequently in non-quit sessions
    // A "strong minute" is a session minute where the athlete was still going
    // after their historical avg quit point
    const strongMinuteMap: Record<number, number> = {};
    for (const s of cutSessions) {
      if (s.breakthroughSession) {
        // Count each minute up to session duration as "survived"
        for (let m = 1; m <= s.durationMinutes; m++) {
          strongMinuteMap[m] = (strongMinuteMap[m] ?? 0) + 1;
        }
      }
    }
    const strongMinutes = Object.entries(strongMinuteMap)
      .filter(([, count]) => count >= 2) // appeared in at least 2 breakthrough sessions
      .map(([minute]) => Number(minute))
      .sort((a, b) => a - b)
      .slice(0, 10); // top 10

    // Quit triggers — collect from wrestlingProfile mental triggers if sessions have notes
    // For now derive from session states where they quit
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

    // Last comparable cut summary — find the most recent cut with similar weight to cut
    // This is a narrative string generated from session history
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
