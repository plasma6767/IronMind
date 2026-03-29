// ─── Enums ────────────────────────────────────────────────────────────────────

export type WrestlingStyle = "folkstyle" | "freestyle" | "greco";

export type MentalArchetype = "competitor" | "craftsman" | "warrior";

export type SessionMode = "cut" | "protocol" | "reset";

export type SessionState =
  | "EARLY"
  | "BUILDING"
  | "PRE_WALL"
  | "AT_WALL"
  | "BREAKTHROUGH";

export type ChallengeType =
  | "pressure_test"
  | "identity_challenge"
  | "visualization_lock";

export type ResetTrigger = "loss" | "bad_practice" | "spiral" | "confidence_dip";

export type ProtocolPhase =
  | "breathing"
  | "visualization"
  | "identity_reinforcement"
  | "ignition";

// ─── Durable Object Schema ────────────────────────────────────────────────────

export interface Identity {
  athleteId: string;
  name: string;
  sport: "wrestling";
  weightClass: number;
  naturalWeight: number;
  yearsWrestling: number;
  style: WrestlingStyle;
  voiceModelId: string | null;
  mentalArchetype: MentalArchetype | null;
  createdAt: string; // ISO8601
  lastActive: string; // ISO8601
}

export interface Goals {
  immediate: string;
  seasonal: string;
  proving: string;
  identity: string;
  whyThisSport: string;
}

export interface CurrentCut {
  startWeight: number;
  targetWeight: number;
  competitionDate: string; // ISO8601
  currentWeight: number;
  lastWeighIn: string; // ISO8601
  cutDay: number;
  totalCutDays: number;
}

export interface MentalTriggers {
  cutSpecific: string;
  matchSpecific: string;
  practiceSpecific: string;
}

export interface WrestlingProfile {
  strengths: string[];
  weaknesses: string[];
  mentalTriggers: MentalTriggers;
}

export interface ChallengeScore {
  [key: string]: number;
}

export interface Session {
  id: string;
  date: string; // ISO8601
  mode: SessionMode;
  durationMinutes: number;
  quitMinute: number | null;
  breakthroughSession: boolean;
  sessionState: SessionState;
  challengesFired: ChallengeType[];
  challengeScores: ChallengeScore;
  conversationTurns: number;
}

export interface MentalPatterns {
  avgQuitMinute: number | null;
  quitTriggers: string[];
  strongMinutes: number[];
  breakthroughCount: number;
  currentStreak: number;
  longestStreak: number;
  totalSessions: number;
  lastComparableCutSummary: string | null;
}

export interface MindsetScores {
  pressureTolerance: number;
  focusControl: number;
  identityStability: number;
  discomfortTolerance: number;
  adversityResponse: number;
}

export interface ChallengeHistoryEntry {
  date: string; // ISO8601
  type: ChallengeType;
  scenario: string;
  athleteResponse: string;
  agentAssessment: string;
  score: number;
  sessionMinute: number;
}

export interface MindsetTraining {
  challengeStreak: number;
  scores: MindsetScores;
  weakestDimension: keyof MindsetScores;
  strongestDimension: keyof MindsetScores;
  challengeHistory: ChallengeHistoryEntry[];
}

export interface UpcomingOpponent {
  name: string;
  school: string;
  record: string;
  tendencies: string;
  lastMeetingResult: string | null;
  psychologicalNotes: string;
}

// Full athlete Durable Object state
export interface AthleteData {
  identity: Identity;
  goals: Goals;
  currentCut: CurrentCut | null;
  wrestlingProfile: WrestlingProfile;
  sessions: Session[];
  mentalPatterns: MentalPatterns;
  mindsetTraining: MindsetTraining;
  identityAnchors: string[];
  upcomingOpponent: UpcomingOpponent | null;
}

// ─── Worker Bindings ──────────────────────────────────────────────────────────

export interface Env {
  ATHLETE_DO: DurableObjectNamespace;
  AUDIO_CACHE: R2Bucket;
  ANTHROPIC_API_KEY: string;
  CF_AI_GATEWAY_URL: string;
  ELEVENLABS_API_KEY: string;
  ELEVENLABS_FALLBACK_VOICE_ID: string;
  CLAUDE_MODEL: string;
  ELEVENLABS_TTS_MODEL: string;
  ENVIRONMENT: string;
}

// ─── Request / Response Shapes ────────────────────────────────────────────────

// ElevenLabs custom LLM endpoint — incoming request format
export interface ElevenLabsLLMRequest {
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  conversation_id?: string;
}

// ElevenLabs custom LLM endpoint — expected response format
export interface ElevenLabsLLMResponse {
  id: string;
  object: "chat.completion";
  model: string;
  choices: Array<{
    index: number;
    message: { role: "assistant"; content: string };
    finish_reason: "stop";
  }>;
}

// Session context passed around during an active cut session
export interface SessionContext {
  athleteId: string;
  sessionMinute: number;
  sessionState: SessionState;
  lastAthleteMessage: string | null;
  challengesThisSession: ChallengeType[];
}
