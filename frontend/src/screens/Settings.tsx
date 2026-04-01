import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { IronMindMascot } from "../components/Mascot";

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

interface SettingsProps {
  athleteId: string;
  onSignOut: () => void;
  onRedoOnboarding: () => void;
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-1 h-4 rounded-full" style={{ background: "linear-gradient(180deg, #2563EB, #60A5FA)" }} />
      <p className="text-silver-light text-xs font-bold uppercase tracking-widest">{label}</p>
    </div>
  );
}

// ─── Profile row ──────────────────────────────────────────────────────────────

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-silver text-sm">{label}</span>
      <span className="text-primary text-sm font-semibold">{value}</span>
    </div>
  );
}

// ─── Input field ──────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-muted text-xs mb-1.5 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function Settings({ athleteId, onSignOut, onRedoOnboarding }: SettingsProps) {
  const navigate = useNavigate();

  const [athleteData, setAthleteData] = useState<AthleteData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [isConfirmingReset, setIsConfirmingReset] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const [currentWeight, setCurrentWeight] = useState("");
  const [targetWeight, setTargetWeight] = useState("");
  const [competitionDate, setCompetitionDate] = useState("");

  const [opponentName, setOpponentName] = useState("");
  const [opponentSchool, setOpponentSchool] = useState("");
  const [opponentRecord, setOpponentRecord] = useState("");
  const [opponentTendencies, setOpponentTendencies] = useState("");
  const [opponentPsychNotes, setOpponentPsychNotes] = useState("");

  const inputClass = "w-full bg-surface-2 border border-border rounded-xl px-4 py-3 text-primary text-base focus:outline-none focus:border-blue transition-colors placeholder:text-muted";

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
      onRedoOnboarding();
    } catch {
      setIsResetting(false);
      setIsConfirmingReset(false);
    }
  }

  const scores = athleteData?.mindsetTraining?.scores;
  const weakest = athleteData?.mindsetTraining?.weakestDimension;
  const strongest = athleteData?.mindsetTraining?.strongestDimension;
  const challengesDone = athleteData?.mindsetTraining?.challengeHistory?.length ?? 0;

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full bg-background overflow-y-auto">

      {/* Header */}
      <div className="flex items-center gap-4 px-6 pt-10 pb-6 border-b border-border">
        <button
          className="flex items-center gap-1.5 text-silver text-sm min-h-touch"
          onClick={() => navigate(-1)}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back
        </button>
        <IronMindMascot width={32} minimal />
        <h1 className="text-primary font-black text-lg">Settings</h1>
      </div>

      <div className="flex flex-col gap-8 px-6 py-8 pb-16">

        {/* ── Profile ─────────────────────────────────────────────────────────── */}
        <section>
          <SectionHeader label="Profile" />
          {athleteData ? (
            <div className="bg-surface border border-border rounded-2xl p-5 flex flex-col gap-2 shadow-card">
              <ProfileRow label="Name" value={athleteData.identity.name} />
              <div className="h-px bg-border" />
              <ProfileRow label="Weight class" value={`${athleteData.identity.weightClass} lbs`} />
              <ProfileRow label="Natural weight" value={`${athleteData.identity.naturalWeight} lbs`} />
              <div className="h-px bg-border" />
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
            <p className="text-silver text-sm">Loading...</p>
          )}
        </section>

        {/* ── Goals ───────────────────────────────────────────────────────────── */}
        {athleteData?.goals && (
          <section>
            <SectionHeader label="Goals" />
            <div className="bg-surface border border-border rounded-2xl p-5 flex flex-col gap-4 shadow-card">
              {GOAL_LABELS.map(({ key, label }) => {
                const value = athleteData.goals![key];
                if (!value) return null;
                return (
                  <div key={key}>
                    <p className="text-muted text-xs mb-1 uppercase tracking-wide">{label}</p>
                    <p className="text-primary text-sm leading-relaxed">{value}</p>
                  </div>
                );
              })}
              <p className="text-muted text-xs mt-1 pt-2 border-t border-border">
                Goals update automatically as IronMind learns from your sessions.
              </p>
            </div>
          </section>
        )}

        {/* ── Mindset Profile ─────────────────────────────────────────────────── */}
        <section>
          <SectionHeader label="Mindset Profile" />
          {scores ? (
            <div className="bg-surface border border-border rounded-2xl p-5 flex flex-col gap-4 shadow-card">
              {Object.entries(scores).map(([key, value]) => {
                const isWeak = key === weakest;
                const isBest = key === strongest;
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-sm font-semibold ${isWeak ? "text-primary" : "text-silver"}`}>
                        {DIMENSION_LABELS[key] ?? key}
                      </span>
                      <div className="flex items-center gap-2">
                        {isWeak && (
                          <span className="text-xs text-blue-light border border-blue-deeper rounded-full px-2 py-0.5">
                            focus area
                          </span>
                        )}
                        {isBest && !isWeak && (
                          <span className="text-xs text-silver border border-border rounded-full px-2 py-0.5">
                            strongest
                          </span>
                        )}
                        <span className="text-primary font-mono text-sm tabular-nums font-bold">
                          {value.toFixed(1)}
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-border rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${(value / 10) * 100}%`,
                          background: isWeak
                            ? "linear-gradient(90deg, #1D4ED8, #60A5FA)"
                            : "linear-gradient(90deg, #1a2744, #2563EB)",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
              <p className="text-muted text-xs mt-1 pt-2 border-t border-border">
                {challengesDone === 0
                  ? "Scores update as IronMind observes your mental patterns across sessions."
                  : `Updated across ${challengesDone} challenge${challengesDone !== 1 ? "s" : ""}.`}
              </p>
            </div>
          ) : (
            <p className="text-silver text-sm">Loading...</p>
          )}
        </section>

        {/* ── Current Cut ─────────────────────────────────────────────────────── */}
        <section>
          <SectionHeader label="Current Cut" />
          <div className="flex flex-col gap-3">
            <Field label="Current weight (lbs)">
              <input type="number" inputMode="decimal" step="0.1" placeholder="e.g. 171.4"
                value={currentWeight} onChange={(e) => setCurrentWeight(e.target.value)}
                className={inputClass} />
            </Field>
            <Field label="Target weight (lbs)">
              <input type="number" inputMode="decimal" step="0.1" placeholder="e.g. 165.0"
                value={targetWeight} onChange={(e) => setTargetWeight(e.target.value)}
                className={inputClass} />
            </Field>
            <Field label="Competition date">
              <input type="date" value={competitionDate}
                onChange={(e) => setCompetitionDate(e.target.value)}
                className={inputClass} />
            </Field>
          </div>
        </section>

        {/* ── Upcoming Opponent ────────────────────────────────────────────────── */}
        <section>
          <SectionHeader label="Upcoming Opponent" />
          <div className="flex flex-col gap-3">
            <input type="text" placeholder="Name" value={opponentName}
              onChange={(e) => setOpponentName(e.target.value)} className={inputClass} />
            <div className="flex gap-3">
              <input type="text" placeholder="School" value={opponentSchool}
                onChange={(e) => setOpponentSchool(e.target.value)} className={`${inputClass} flex-1`} />
              <input type="text" placeholder="Record (18-4)" value={opponentRecord}
                onChange={(e) => setOpponentRecord(e.target.value)} className={`${inputClass} flex-1`} />
            </div>
            <textarea rows={3} placeholder="Tendencies — heavy double leg, slow starter"
              value={opponentTendencies} onChange={(e) => setOpponentTendencies(e.target.value)}
              className={`${inputClass} resize-none`} />
            <textarea rows={2} placeholder="Psychological notes — rattles when pace breaks early"
              value={opponentPsychNotes} onChange={(e) => setOpponentPsychNotes(e.target.value)}
              className={`${inputClass} resize-none`} />
          </div>
        </section>

        {/* ── Save button ──────────────────────────────────────────────────────── */}
        {saveError && (
          <p className="text-red-400 text-sm text-center -mb-4">{saveError}</p>
        )}

        <button
          className="w-full py-4 rounded-2xl font-black text-lg text-white shadow-blue-sm active:scale-[0.98] transition-transform disabled:opacity-50"
          style={{
            background: saveSuccess
              ? "linear-gradient(135deg, #166534, #16a34a)"
              : isSaving
              ? "#1a2744"
              : "linear-gradient(135deg, #1D4ED8 0%, #2563EB 60%, #1E40AF 100%)",
          }}
          onClick={handleSave}
          disabled={isSaving || !athleteData}
        >
          {isSaving ? "Saving..." : saveSuccess ? "Saved" : "Save Changes"}
        </button>

        {/* ── Account ─────────────────────────────────────────────────────────── */}
        <section>
          <SectionHeader label="Account" />
          <div className="bg-surface border border-border rounded-2xl p-5 flex flex-col gap-4 shadow-card">

            {/* Redo onboarding */}
            <div>
              <p className="text-primary text-sm font-bold mb-1">Redo Onboarding</p>
              <p className="text-muted text-xs leading-relaxed">
                Clears your profile and restarts the voice interview. Your session history will be lost.
              </p>
            </div>

            {isConfirmingReset ? (
              <div className="flex gap-3">
                <button
                  className="flex-1 py-3 border border-border rounded-xl text-silver text-sm"
                  onClick={() => setIsConfirmingReset(false)}
                  disabled={isResetting}
                >
                  Cancel
                </button>
                <button
                  className="flex-1 py-3 border border-red-500 text-red-400 rounded-xl text-sm font-semibold disabled:opacity-50"
                  onClick={handleRedoOnboarding}
                  disabled={isResetting}
                >
                  {isResetting ? "Resetting..." : "Yes, reset"}
                </button>
              </div>
            ) : (
              <button
                className="py-3 border border-border rounded-xl text-silver text-sm w-full hover:border-border-light transition-colors"
                onClick={() => setIsConfirmingReset(true)}
              >
                Redo Onboarding
              </button>
            )}
          </div>
        </section>

        {/* ── Sign out ─────────────────────────────────────────────────────────── */}
        <button
          className="w-full py-3 text-silver text-sm border border-border rounded-2xl hover:border-border-light transition-colors"
          onClick={onSignOut}
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
