import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

// Local types — mirrors worker/src/types.ts but without Cloudflare-specific bindings
interface AthleteData {
  identity: {
    name: string;
    weightClass: number;
    naturalWeight: number;
    style: string;
    mentalArchetype: string | null;
  };
  goals: {
    immediate: string;
    seasonal: string;
    proving: string;
    identity: string;
    whyThisSport: string;
  } | null;
  currentCut: {
    startWeight: number;
    currentWeight: number;
    targetWeight: number;
    competitionDate: string;
    lastWeighIn: string;
    cutDay: number;
    totalCutDays: number;
  } | null;
  upcomingOpponent: {
    name: string;
    school: string;
    record: string;
    tendencies: string;
    psychologicalNotes: string;
    lastMeetingResult: string | null;
  } | null;
  mindsetTraining: {
    challengeStreak: number;
    scores: Record<string, number>;
    weakestDimension: string;
    strongestDimension: string;
    challengeHistory: unknown[];
  };
}

// ─── Display helpers ──────────────────────────────────────────────────────────

const DIMENSION_LABELS: Record<string, string> = {
  pressureTolerance:   "Pressure Tolerance",
  focusControl:        "Focus Control",
  identityStability:   "Identity Stability",
  discomfortTolerance: "Discomfort Tolerance",
  adversityResponse:   "Adversity Response",
};

const STYLE_LABELS: Record<string, string> = {
  folkstyle: "Folkstyle",
  freestyle: "Freestyle",
  greco:     "Greco-Roman",
};

const ARCHETYPE_LABELS: Record<string, string> = {
  competitor: "Competitor",
  craftsman:  "Craftsman",
  warrior:    "Warrior",
};

const GOAL_LABELS: Array<{ key: keyof NonNullable<AthleteData["goals"]>; label: string }> = [
  { key: "immediate",    label: "Immediate goal" },
  { key: "seasonal",     label: "Season goal" },
  { key: "proving",      label: "What you're proving" },
  { key: "identity",     label: "Who you are as an athlete" },
  { key: "whyThisSport", label: "Why this sport" },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface SettingsProps {
  athleteId: string;
  onSignOut: () => void;
  onRedoOnboarding: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Settings({ athleteId, onSignOut, onRedoOnboarding }: SettingsProps) {
  const navigate = useNavigate();

  const [athleteData, setAthleteData] = useState<AthleteData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Redo-onboarding confirmation state — requires two deliberate taps
  const [isConfirmingReset, setIsConfirmingReset] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // ── Cut fields ───────────────────────────────────────────────────────────────
  const [currentWeight, setCurrentWeight] = useState("");
  const [targetWeight, setTargetWeight] = useState("");
  const [competitionDate, setCompetitionDate] = useState("");

  // ── Opponent fields ──────────────────────────────────────────────────────────
  const [opponentName, setOpponentName] = useState("");
  const [opponentSchool, setOpponentSchool] = useState("");
  const [opponentRecord, setOpponentRecord] = useState("");
  const [opponentTendencies, setOpponentTendencies] = useState("");
  const [opponentPsychNotes, setOpponentPsychNotes] = useState("");

  // ── Load ─────────────────────────────────────────────────────────────────────

  useEffect(() => {
    fetch(`/api/athlete/${encodeURIComponent(athleteId)}`)
      .then((r) => r.json() as Promise<AthleteData | null>)
      .then((data) => {
        if (!data) return;
        setAthleteData(data);

        const cut = data.currentCut;
        if (cut) {
          setCurrentWeight(String(cut.currentWeight ?? ""));
          setTargetWeight(String(cut.targetWeight ?? ""));
          // Format ISO date to yyyy-mm-dd for <input type="date">
          setCompetitionDate(cut.competitionDate ? cut.competitionDate.slice(0, 10) : "");
        }

        const opp = data.upcomingOpponent;
        if (opp) {
          setOpponentName(opp.name ?? "");
          setOpponentSchool(opp.school ?? "");
          setOpponentRecord(opp.record ?? "");
          setOpponentTendencies(opp.tendencies ?? "");
          setOpponentPsychNotes(opp.psychologicalNotes ?? "");
        }
      })
      .catch(() => {});
  }, [athleteId]);

  // ── Save ─────────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!athleteData) return;
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    const cw = parseFloat(currentWeight);
    const tw = parseFloat(targetWeight);

    // Build the full currentCut object — shallow merge in DO would otherwise drop fields
    const updatedCut: AthleteData["currentCut"] = athleteData.currentCut
      ? {
          ...athleteData.currentCut,
          ...(isFinite(cw) ? { currentWeight: cw } : {}),
          ...(isFinite(tw) ? { targetWeight: tw } : {}),
          ...(competitionDate ? { competitionDate: new Date(competitionDate).toISOString() } : {}),
          lastWeighIn: new Date().toISOString(),
        }
      : isFinite(cw) || isFinite(tw) || competitionDate
        ? {
            startWeight: isFinite(cw) ? cw : 0,
            currentWeight: isFinite(cw) ? cw : 0,
            targetWeight: isFinite(tw) ? tw : 0,
            competitionDate: competitionDate ? new Date(competitionDate).toISOString() : new Date().toISOString(),
            lastWeighIn: new Date().toISOString(),
            cutDay: 1,
            totalCutDays: 1,
          }
        : null;

    // Build full opponent object so no fields are silently dropped
    const updatedOpponent: AthleteData["upcomingOpponent"] = opponentName.trim()
      ? {
          name: opponentName.trim(),
          school: opponentSchool.trim(),
          record: opponentRecord.trim(),
          tendencies: opponentTendencies.trim(),
          psychologicalNotes: opponentPsychNotes.trim(),
          lastMeetingResult: athleteData.upcomingOpponent?.lastMeetingResult ?? null,
        }
      : athleteData.upcomingOpponent;

    try {
      const res = await fetch(`/api/athlete/${encodeURIComponent(athleteId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentCut: updatedCut, upcomingOpponent: updatedOpponent }),
      });
      if (!res.ok) throw new Error("Save failed");

      // Refresh local state so mindset scores and derived values stay in sync
      const refreshed = await fetch(`/api/athlete/${encodeURIComponent(athleteId)}`);
      const updated = (await refreshed.json()) as AthleteData | null;
      if (updated) setAthleteData(updated);

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch {
      setSaveError("Couldn't save — try again");
    } finally {
      setIsSaving(false);
    }
  }

  // ── Redo onboarding ──────────────────────────────────────────────────────────

  async function handleRedoOnboarding() {
    setIsResetting(true);
    try {
      await fetch(`/api/athlete/${encodeURIComponent(athleteId)}/reset`, { method: "POST" });
      onRedoOnboarding(); // App routing state update — navigates to /onboarding
    } catch {
      setIsResetting(false);
      setIsConfirmingReset(false);
    }
  }

  // ── Derived display values ───────────────────────────────────────────────────

  const scores = athleteData?.mindsetTraining?.scores;
  const weakest = athleteData?.mindsetTraining?.weakestDimension;
  const strongest = athleteData?.mindsetTraining?.strongestDimension;
  const challengesDone = athleteData?.mindsetTraining?.challengeHistory?.length ?? 0;

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full bg-background overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 pt-10 pb-6 border-b border-border">
        <button
          className="text-muted text-sm min-h-touch flex items-center"
          onClick={() => navigate(-1)}
        >
          ← Back
        </button>
        <h1 className="text-primary font-semibold text-lg">Settings</h1>
      </div>

      <div className="flex flex-col gap-8 px-6 py-8 pb-16">

        {/* ── Profile ─────────────────────────────────────────────────────────── */}
        <section>
          <p className="text-muted text-xs uppercase tracking-widest mb-4">Profile</p>
          {athleteData ? (
            <div className="bg-surface border border-border rounded-2xl p-5 flex flex-col gap-3">
              <ProfileRow label="Name" value={athleteData.identity.name} />
              <ProfileRow label="Weight class" value={`${athleteData.identity.weightClass} lbs`} />
              <ProfileRow label="Natural weight" value={`${athleteData.identity.naturalWeight} lbs`} />
              <ProfileRow
                label="Style"
                value={STYLE_LABELS[athleteData.identity.style] ?? athleteData.identity.style}
              />
              {athleteData.identity.mentalArchetype && (
                <ProfileRow
                  label="Mental archetype"
                  value={ARCHETYPE_LABELS[athleteData.identity.mentalArchetype] ?? athleteData.identity.mentalArchetype}
                />
              )}
            </div>
          ) : (
            <p className="text-muted text-sm">Loading...</p>
          )}
        </section>

        {/* ── Goals ───────────────────────────────────────────────────────────── */}
        {athleteData?.goals && (
          <section>
            <p className="text-muted text-xs uppercase tracking-widest mb-4">Goals</p>
            <div className="bg-surface border border-border rounded-2xl p-5 flex flex-col gap-4">
              {GOAL_LABELS.map(({ key, label }) => {
                const value = athleteData.goals![key];
                if (!value) return null;
                return (
                  <div key={key}>
                    <p className="text-muted text-xs mb-1">{label}</p>
                    <p className="text-primary text-sm leading-relaxed">{value}</p>
                  </div>
                );
              })}
              <p className="text-muted text-xs mt-1">
                Goals are set during onboarding. Use "Redo Onboarding" below to update them.
              </p>
            </div>
          </section>
        )}

        {/* ── Mindset Profile ─────────────────────────────────────────────────── */}
        <section>
          <p className="text-muted text-xs uppercase tracking-widest mb-4">Mindset Profile</p>

          {scores ? (
            <div className="bg-surface border border-border rounded-2xl p-5 flex flex-col gap-4">
              {Object.entries(scores).map(([key, value]) => {
                const isWeak = key === weakest;
                const isBest = key === strongest;
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`text-sm font-medium ${isWeak ? "text-primary" : "text-muted"}`}>
                        {DIMENSION_LABELS[key] ?? key}
                      </span>
                      <div className="flex items-center gap-2">
                        {isWeak && (
                          <span className="text-xs text-muted border border-border rounded-full px-2 py-0.5">
                            focus area
                          </span>
                        )}
                        {isBest && !isWeak && (
                          <span className="text-xs text-muted border border-border rounded-full px-2 py-0.5">
                            strongest
                          </span>
                        )}
                        <span className="text-primary font-mono text-sm tabular-nums">
                          {value.toFixed(1)}
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-border rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${(value / 10) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}

              <p className="text-muted text-xs mt-1">
                {challengesDone === 0
                  ? "Scores update as you complete mindset challenges during sessions."
                  : `Updated across ${challengesDone} challenge${challengesDone !== 1 ? "s" : ""}.`}
              </p>
            </div>
          ) : (
            <p className="text-muted text-sm">Loading...</p>
          )}
        </section>

        {/* ── Current Cut ─────────────────────────────────────────────────────── */}
        <section>
          <p className="text-muted text-xs uppercase tracking-widest mb-4">Current Cut</p>
          <div className="flex flex-col gap-3">
            <div>
              <label className="block text-muted text-xs mb-1.5">Current weight (lbs)</label>
              <input
                type="number"
                inputMode="decimal"
                step="0.1"
                placeholder="e.g. 171.4"
                value={currentWeight}
                onChange={(e) => setCurrentWeight(e.target.value)}
                className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-primary text-base focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-muted text-xs mb-1.5">Target weight (lbs)</label>
              <input
                type="number"
                inputMode="decimal"
                step="0.1"
                placeholder="e.g. 165.0"
                value={targetWeight}
                onChange={(e) => setTargetWeight(e.target.value)}
                className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-primary text-base focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-muted text-xs mb-1.5">Competition date</label>
              <input
                type="date"
                value={competitionDate}
                onChange={(e) => setCompetitionDate(e.target.value)}
                className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-primary text-base focus:outline-none focus:border-primary"
              />
            </div>
          </div>
        </section>

        {/* ── Upcoming Opponent ────────────────────────────────────────────────── */}
        <section>
          <p className="text-muted text-xs uppercase tracking-widest mb-4">Upcoming Opponent</p>
          <div className="flex flex-col gap-3">
            <input
              type="text"
              placeholder="Name"
              value={opponentName}
              onChange={(e) => setOpponentName(e.target.value)}
              className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-primary text-base focus:outline-none focus:border-primary placeholder:text-muted"
            />
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="School"
                value={opponentSchool}
                onChange={(e) => setOpponentSchool(e.target.value)}
                className="flex-1 bg-surface border border-border rounded-xl px-4 py-3 text-primary text-base focus:outline-none focus:border-primary placeholder:text-muted"
              />
              <input
                type="text"
                placeholder="Record (e.g. 18-4)"
                value={opponentRecord}
                onChange={(e) => setOpponentRecord(e.target.value)}
                className="flex-1 bg-surface border border-border rounded-xl px-4 py-3 text-primary text-base focus:outline-none focus:border-primary placeholder:text-muted"
              />
            </div>
            <textarea
              rows={3}
              placeholder="Tendencies — e.g. heavy double leg, slow starter"
              value={opponentTendencies}
              onChange={(e) => setOpponentTendencies(e.target.value)}
              className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-primary text-base focus:outline-none focus:border-primary placeholder:text-muted resize-none"
            />
            <textarea
              rows={2}
              placeholder="Psychological notes — e.g. relies on physicality, rattles when pace breaks"
              value={opponentPsychNotes}
              onChange={(e) => setOpponentPsychNotes(e.target.value)}
              className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-primary text-base focus:outline-none focus:border-primary placeholder:text-muted resize-none"
            />
          </div>
        </section>

        {/* ── Save ────────────────────────────────────────────────────────────── */}
        {saveError && (
          <p className="text-red-400 text-sm text-center -mb-4">{saveError}</p>
        )}

        <button
          className="w-full py-4 bg-primary text-background font-semibold rounded-2xl min-h-touch active:opacity-80 disabled:opacity-50"
          onClick={handleSave}
          disabled={isSaving || !athleteData}
        >
          {isSaving ? "Saving..." : saveSuccess ? "Saved" : "Save Changes"}
        </button>

        {/* ── Redo Onboarding ──────────────────────────────────────────────────── */}
        <section>
          <p className="text-muted text-xs uppercase tracking-widest mb-4">Account</p>
          <div className="bg-surface border border-border rounded-2xl p-5 flex flex-col gap-3">
            <div>
              <p className="text-primary text-sm font-medium">Redo Onboarding</p>
              <p className="text-muted text-xs mt-1">
                Clears your profile and restarts the voice interview. Your sessions and mindset history will be lost.
              </p>
            </div>

            {isConfirmingReset ? (
              <div className="flex gap-3 pt-1">
                <button
                  className="flex-1 py-2.5 border border-border rounded-xl text-muted text-sm"
                  onClick={() => setIsConfirmingReset(false)}
                  disabled={isResetting}
                >
                  Cancel
                </button>
                <button
                  className="flex-1 py-2.5 border border-red-500 text-red-400 rounded-xl text-sm disabled:opacity-50"
                  onClick={handleRedoOnboarding}
                  disabled={isResetting}
                >
                  {isResetting ? "Resetting..." : "Yes, reset"}
                </button>
              </div>
            ) : (
              <button
                className="py-2.5 border border-border rounded-xl text-muted text-sm w-full"
                onClick={() => setIsConfirmingReset(true)}
              >
                Redo Onboarding
              </button>
            )}
          </div>
        </section>

        {/* ── Sign Out ─────────────────────────────────────────────────────────── */}
        <button
          className="w-full py-3 text-muted text-sm"
          onClick={onSignOut}
        >
          Sign Out
        </button>

      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted text-sm">{label}</span>
      <span className="text-primary text-sm font-medium">{value}</span>
    </div>
  );
}
