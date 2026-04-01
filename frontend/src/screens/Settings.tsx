import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

// Local types — mirrors worker/src/types.ts but without Cloudflare-specific bindings
interface AthleteData {
  identity: { name: string };
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

interface SettingsProps {
  athleteId: string;
  onSignOut: () => void;
}

export default function Settings({ athleteId, onSignOut }: SettingsProps) {
  const navigate = useNavigate();

  const [athleteData, setAthleteData] = useState<AthleteData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

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

    // Build the full currentCut object so shallow merge in DO doesn't drop fields
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

    // Build full opponent object
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

    const updates: Partial<AthleteData> = {
      currentCut: updatedCut,
      upcomingOpponent: updatedOpponent,
    };

    try {
      const res = await fetch(`/api/athlete/${encodeURIComponent(athleteId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Save failed");

      // Refresh local state so mindset scores stay up to date
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

  // ── Mindset scores ───────────────────────────────────────────────────────────

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
