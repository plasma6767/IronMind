import { describe, it, expect } from "vitest";
import { buildProfileLearningPrompt, buildSessionEvaluationPrompt } from "../prompts/index";
import type { AthleteData } from "../types";

function makeAthlete(): AthleteData {
  return {
    identity: {
      athleteId: "test-001",
      name: "Jake",
      sport: "wrestling",
      weightClass: 165,
      naturalWeight: 175,
      yearsWrestling: 8,
      style: "folkstyle",
      voiceModelId: null,
      mentalArchetype: "competitor",
      createdAt: "2024-01-01T00:00:00Z",
      lastActive: "2024-01-01T00:00:00Z",
    },
    goals: {
      immediate: "make weight",
      seasonal: "win conference",
      proving: "I belong at this level",
      identity: "the hardest worker",
      whyThisSport: "my dad taught me",
    },
    currentCut: null,
    wrestlingProfile: {
      strengths: ["top game", "hand fighting"],
      weaknesses: [],
      mentalTriggers: {
        cutSpecific: "hunger pangs",
        matchSpecific: "being taken down first",
        practiceSpecific: "unknown",
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
        pressureTolerance: 6,
        focusControl: 5,
        identityStability: 7,
        discomfortTolerance: 4,
        adversityResponse: 5,
      },
      weakestDimension: "discomfortTolerance",
      strongestDimension: "identityStability",
      challengeHistory: [],
    },
    identityAnchors: ["went 4-0 at state qualifier despite cutting 12 lbs"],
    upcomingOpponent: null,
  };
}

// ─── buildProfileLearningPrompt ───────────────────────────────────────────────

describe("buildProfileLearningPrompt", () => {
  const athlete = makeAthlete();
  const transcript = [
    { role: "assistant" as const, content: "How are you feeling today?" },
    { role: "user" as const, content: "Pretty good. I've been cutting hard." },
    { role: "assistant" as const, content: "What's been the hardest part?" },
    { role: "user" as const, content: "The thirst. I can handle hunger but the dry mouth messes with my focus." },
  ];

  it("includes the athlete name", () => {
    const prompt = buildProfileLearningPrompt(athlete, transcript);
    expect(prompt).toContain("Jake");
  });

  it("includes existing identity anchors so Claude avoids repeating them", () => {
    const prompt = buildProfileLearningPrompt(athlete, transcript);
    expect(prompt).toContain("went 4-0 at state qualifier despite cutting 12 lbs");
  });

  it("includes existing mental triggers so Claude avoids repeating them", () => {
    const prompt = buildProfileLearningPrompt(athlete, transcript);
    expect(prompt).toContain("hunger pangs");
  });

  it("includes the transcript with athlete name replacing 'user'", () => {
    const prompt = buildProfileLearningPrompt(athlete, transcript);
    expect(prompt).toContain("Jake:");
    expect(prompt).toContain("Coach:");
  });

  it("specifies the correct JSON output shape", () => {
    const prompt = buildProfileLearningPrompt(athlete, transcript);
    expect(prompt).toContain('"identityAnchors"');
    expect(prompt).toContain('"goals"');
    expect(prompt).toContain('"wrestlingProfile"');
    expect(prompt).toContain('"mentalTriggers"');
  });

  it("instructs Claude not to repeat existing profile data", () => {
    const prompt = buildProfileLearningPrompt(athlete, transcript);
    expect(prompt.toLowerCase()).toContain("new");
    expect(prompt).toContain("CURRENT PROFILE");
  });
});

// ─── buildSessionEvaluationPrompt ────────────────────────────────────────────

describe("buildSessionEvaluationPrompt", () => {
  it("includes all five dimension names", () => {
    const prompt = buildSessionEvaluationPrompt(makeAthlete(), "workout", 15);
    expect(prompt).toContain("pressureTolerance");
    expect(prompt).toContain("focusControl");
    expect(prompt).toContain("identityStability");
    expect(prompt).toContain("discomfortTolerance");
    expect(prompt).toContain("adversityResponse");
  });

  it("includes the current scores", () => {
    const prompt = buildSessionEvaluationPrompt(makeAthlete(), "general", 10);
    expect(prompt).toContain("4"); // discomfortTolerance score
    expect(prompt).toContain("7"); // identityStability score
  });

  it("includes the session mode and duration", () => {
    const prompt = buildSessionEvaluationPrompt(makeAthlete(), "prematch", 8);
    expect(prompt).toContain("prematch");
    expect(prompt).toContain("8 min");
  });

  it("includes the weakest dimension", () => {
    const prompt = buildSessionEvaluationPrompt(makeAthlete(), "workout", 20);
    expect(prompt).toContain("discomfortTolerance");
  });

  it("instructs Claude to return JSON with a reasoning field", () => {
    const prompt = buildSessionEvaluationPrompt(makeAthlete(), "postmatch", 12);
    expect(prompt).toContain('"reasoning"');
  });
});
