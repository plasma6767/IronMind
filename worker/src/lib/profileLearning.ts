import type { AthleteData } from "../types";

// Shape returned by Claude's profile-learning extraction pass
export interface ProfileLearningUpdates {
  identityAnchors?: string[];
  goals?: {
    immediate?: string | null;
    seasonal?: string | null;
    proving?: string | null;
    identity?: string | null;
    whyThisSport?: string | null;
  };
  wrestlingProfile?: {
    strengths?: string[];
    weaknesses?: string[];
    mentalTriggers?: {
      cutSpecific?: string | null;
      matchSpecific?: string | null;
      practiceSpecific?: string | null;
    };
  };
}

// Pure function — merges Claude's qualitative extraction into the full athlete record.
// All merges are additive: arrays are append+deduplicated, string fields are only
// overwritten when a non-null, non-empty value is provided.
// Returns a new AthleteData object (does not mutate the input).
export function mergeProfileLearning(
  data: AthleteData,
  updates: ProfileLearningUpdates
): AthleteData {
  // Deep-clone only the fields we touch so the rest of the object stays shared
  const result: AthleteData = {
    ...data,
    identityAnchors: [...data.identityAnchors],
    goals: { ...data.goals },
    wrestlingProfile: {
      ...data.wrestlingProfile,
      strengths: [...data.wrestlingProfile.strengths],
      weaknesses: [...data.wrestlingProfile.weaknesses],
      mentalTriggers: { ...data.wrestlingProfile.mentalTriggers },
    },
  };

  // ── Identity anchors — append new, deduplicate by normalised text ─────────
  if (updates.identityAnchors?.length) {
    const seen = new Set(result.identityAnchors.map((a) => a.toLowerCase().trim()));
    for (const anchor of updates.identityAnchors) {
      const key = anchor.toLowerCase().trim();
      if (key && !seen.has(key)) {
        result.identityAnchors.push(anchor);
        seen.add(key);
      }
    }
    // Cap at 20 most-recent anchors to prevent unbounded storage growth
    result.identityAnchors = result.identityAnchors.slice(-20);
  }

  // ── Goals — update only fields where a new value was extracted ────────────
  if (updates.goals && result.goals) {
    const keys: (keyof NonNullable<typeof updates.goals>)[] = [
      "immediate", "seasonal", "proving", "identity", "whyThisSport",
    ];
    for (const key of keys) {
      const val = updates.goals[key];
      if (val && val.trim()) result.goals[key] = val.trim();
    }
  }

  // ── Wrestling profile — strengths and weaknesses are append-only ──────────
  if (updates.wrestlingProfile) {
    const wp = result.wrestlingProfile;

    if (updates.wrestlingProfile.strengths?.length) {
      const seen = new Set(wp.strengths.map((s) => s.toLowerCase()));
      for (const s of updates.wrestlingProfile.strengths) {
        if (s.trim() && !seen.has(s.toLowerCase())) {
          wp.strengths.push(s.trim());
          seen.add(s.toLowerCase());
        }
      }
    }

    if (updates.wrestlingProfile.weaknesses?.length) {
      const seen = new Set(wp.weaknesses.map((w) => w.toLowerCase()));
      for (const w of updates.wrestlingProfile.weaknesses) {
        if (w.trim() && !seen.has(w.toLowerCase())) {
          wp.weaknesses.push(w.trim());
          seen.add(w.toLowerCase());
        }
      }
    }

    // Mental triggers — only overwrite sub-fields that contain a new value
    const mt = updates.wrestlingProfile.mentalTriggers;
    if (mt) {
      if (mt.cutSpecific?.trim())      wp.mentalTriggers.cutSpecific      = mt.cutSpecific.trim();
      if (mt.matchSpecific?.trim())    wp.mentalTriggers.matchSpecific    = mt.matchSpecific.trim();
      if (mt.practiceSpecific?.trim()) wp.mentalTriggers.practiceSpecific = mt.practiceSpecific.trim();
    }
  }

  return result;
}
