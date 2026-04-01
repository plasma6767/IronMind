import { describe, it, expect } from "vitest";
import { mergeProfileLearning } from "../lib/profileLearning";
import type { AthleteData } from "../types";

// ─── Minimal athlete fixture ──────────────────────────────────────────────────

function makeAthlete(overrides: Partial<AthleteData> = {}): AthleteData {
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
        cutSpecific: "hunger",
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
        pressureTolerance: 5,
        focusControl: 5,
        identityStability: 5,
        discomfortTolerance: 5,
        adversityResponse: 5,
      },
      weakestDimension: "discomfortTolerance",
      strongestDimension: "identityStability",
      challengeHistory: [],
    },
    identityAnchors: ["went 4-0 at state qualifier despite cutting 12 lbs"],
    upcomingOpponent: null,
    ...overrides,
  };
}

// ─── Identity anchors ─────────────────────────────────────────────────────────

describe("mergeProfileLearning — identity anchors", () => {
  it("appends new anchors", () => {
    const result = mergeProfileLearning(makeAthlete(), {
      identityAnchors: ["never missed a practice in two years"],
    });
    expect(result.identityAnchors).toHaveLength(2);
    expect(result.identityAnchors[1]).toBe("never missed a practice in two years");
  });

  it("does not duplicate an existing anchor (case-insensitive)", () => {
    const result = mergeProfileLearning(makeAthlete(), {
      identityAnchors: ["Went 4-0 at state qualifier despite cutting 12 lbs"],
    });
    expect(result.identityAnchors).toHaveLength(1);
  });

  it("deduplicates within the incoming batch itself", () => {
    const result = mergeProfileLearning(makeAthlete(), {
      identityAnchors: ["never quit on a teammate", "Never Quit On A Teammate"],
    });
    expect(result.identityAnchors).toHaveLength(2); // original + one new
  });

  it("skips empty or whitespace-only anchors", () => {
    const result = mergeProfileLearning(makeAthlete(), {
      identityAnchors: ["", "   "],
    });
    expect(result.identityAnchors).toHaveLength(1);
  });

  it("caps anchors at 20", () => {
    const many = Array.from({ length: 25 }, (_, i) => `anchor ${i}`);
    const athlete = makeAthlete({ identityAnchors: many });
    const result = mergeProfileLearning(athlete, {
      identityAnchors: ["new anchor A", "new anchor B"],
    });
    expect(result.identityAnchors).toHaveLength(20);
    // The most-recent anchors should be kept
    expect(result.identityAnchors.at(-1)).toBe("new anchor B");
  });

  it("does not mutate the original athlete object", () => {
    const athlete = makeAthlete();
    const original = [...athlete.identityAnchors];
    mergeProfileLearning(athlete, { identityAnchors: ["a new anchor"] });
    expect(athlete.identityAnchors).toEqual(original);
  });
});

// ─── Goals ────────────────────────────────────────────────────────────────────

describe("mergeProfileLearning — goals", () => {
  it("updates a goal field when a new value is provided", () => {
    const result = mergeProfileLearning(makeAthlete(), {
      goals: { immediate: "stay under 168 by Thursday" },
    });
    expect(result.goals!.immediate).toBe("stay under 168 by Thursday");
  });

  it("does not overwrite a goal field when value is null", () => {
    const result = mergeProfileLearning(makeAthlete(), {
      goals: { immediate: null },
    });
    expect(result.goals!.immediate).toBe("make weight");
  });

  it("does not overwrite a goal field when value is empty string", () => {
    const result = mergeProfileLearning(makeAthlete(), {
      goals: { immediate: "   " },
    });
    expect(result.goals!.immediate).toBe("make weight");
  });

  it("leaves unmentioned goal fields untouched", () => {
    const result = mergeProfileLearning(makeAthlete(), {
      goals: { whyThisSport: "it's the hardest thing I've ever done" },
    });
    expect(result.goals!.immediate).toBe("make weight");
    expect(result.goals!.seasonal).toBe("win conference");
    expect(result.goals!.whyThisSport).toBe("it's the hardest thing I've ever done");
  });
});

// ─── Wrestling profile — strengths & weaknesses ───────────────────────────────

describe("mergeProfileLearning — strengths & weaknesses", () => {
  it("appends new strengths", () => {
    const result = mergeProfileLearning(makeAthlete(), {
      wrestlingProfile: { strengths: ["scrambles"] },
    });
    expect(result.wrestlingProfile.strengths).toContain("scrambles");
    expect(result.wrestlingProfile.strengths).toHaveLength(3);
  });

  it("does not duplicate existing strengths (case-insensitive)", () => {
    const result = mergeProfileLearning(makeAthlete(), {
      wrestlingProfile: { strengths: ["Top Game"] },
    });
    expect(result.wrestlingProfile.strengths).toHaveLength(2);
  });

  it("appends new weaknesses", () => {
    const result = mergeProfileLearning(makeAthlete(), {
      wrestlingProfile: { weaknesses: ["low single defense"] },
    });
    expect(result.wrestlingProfile.weaknesses).toContain("low single defense");
  });

  it("does not duplicate existing weaknesses", () => {
    const athlete = makeAthlete({
      wrestlingProfile: {
        strengths: ["top game"],
        weaknesses: ["low single defense"],
        mentalTriggers: { cutSpecific: "hunger", matchSpecific: "taken down first", practiceSpecific: "unknown" },
      },
    });
    const result = mergeProfileLearning(athlete, {
      wrestlingProfile: { weaknesses: ["Low Single Defense"] },
    });
    expect(result.wrestlingProfile.weaknesses).toHaveLength(1);
  });

  it("skips empty strength strings", () => {
    const result = mergeProfileLearning(makeAthlete(), {
      wrestlingProfile: { strengths: ["", "  "] },
    });
    expect(result.wrestlingProfile.strengths).toHaveLength(2); // unchanged
  });
});

// ─── Mental triggers ──────────────────────────────────────────────────────────

describe("mergeProfileLearning — mental triggers", () => {
  it("updates a trigger sub-field when a value is found", () => {
    const result = mergeProfileLearning(makeAthlete(), {
      wrestlingProfile: {
        mentalTriggers: { matchSpecific: "going to overtime" },
      },
    });
    expect(result.wrestlingProfile.mentalTriggers.matchSpecific).toBe("going to overtime");
  });

  it("does not overwrite a trigger when new value is null", () => {
    const result = mergeProfileLearning(makeAthlete(), {
      wrestlingProfile: {
        mentalTriggers: { cutSpecific: null },
      },
    });
    expect(result.wrestlingProfile.mentalTriggers.cutSpecific).toBe("hunger");
  });

  it("does not overwrite a trigger when new value is whitespace", () => {
    const result = mergeProfileLearning(makeAthlete(), {
      wrestlingProfile: {
        mentalTriggers: { practiceSpecific: "   " },
      },
    });
    expect(result.wrestlingProfile.mentalTriggers.practiceSpecific).toBe("unknown");
  });

  it("updates only the sub-fields that are provided", () => {
    const result = mergeProfileLearning(makeAthlete(), {
      wrestlingProfile: {
        mentalTriggers: { practiceSpecific: "losing to a younger wrestler" },
      },
    });
    expect(result.wrestlingProfile.mentalTriggers.cutSpecific).toBe("hunger");
    expect(result.wrestlingProfile.mentalTriggers.matchSpecific).toBe("being taken down first");
    expect(result.wrestlingProfile.mentalTriggers.practiceSpecific).toBe("losing to a younger wrestler");
  });
});

// ─── Empty updates ────────────────────────────────────────────────────────────

describe("mergeProfileLearning — empty / no-op updates", () => {
  it("returns an equivalent object when updates are empty", () => {
    const athlete = makeAthlete();
    const result = mergeProfileLearning(athlete, {});
    expect(result.identityAnchors).toEqual(athlete.identityAnchors);
    expect(result.goals).toEqual(athlete.goals);
    expect(result.wrestlingProfile.strengths).toEqual(athlete.wrestlingProfile.strengths);
  });

  it("handles updates with empty arrays without crashing", () => {
    const result = mergeProfileLearning(makeAthlete(), {
      identityAnchors: [],
      wrestlingProfile: { strengths: [], weaknesses: [] },
    });
    expect(result.wrestlingProfile.strengths).toHaveLength(2);
    expect(result.identityAnchors).toHaveLength(1);
  });
});
