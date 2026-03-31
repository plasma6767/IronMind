import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import WeightDisplay from "../components/WeightDisplay";
import type { AthleteData } from "../../../worker/src/types";

const ATHLETE_ID = localStorage.getItem("athleteId") ?? "test-athlete-001";

export default function Dashboard() {
  const navigate = useNavigate();
  const [athlete, setAthlete] = useState<AthleteData | null>(null);

  useEffect(() => {
    fetch(`/api/athlete/${ATHLETE_ID}`)
      .then((r) => r.json() as Promise<AthleteData>)
      .then(setAthlete)
      .catch(console.error);
  }, []);

  return (
    <div className="flex flex-col h-full bg-background px-6 py-10">
      <h1 className="text-xl font-semibold text-primary mb-1">
        {athlete?.identity?.name ?? "IronMind"}
      </h1>

      {/* Current cut status */}
      {athlete?.currentCut && (
        <WeightDisplay
          currentWeight={athlete.currentCut.currentWeight}
          targetWeight={athlete.currentCut.targetWeight}
          competitionDate={athlete.currentCut.competitionDate}
        />
      )}

      {/* Mode entry */}
      <div className="flex flex-col gap-3 mt-10">
        <button
          className="w-full py-4 bg-surface border border-border rounded-xl text-primary font-medium text-left px-5 min-h-touch active:bg-border"
          onClick={() => navigate("/session/cut")}
        >
          <span className="block text-base">Cut session</span>
          <span className="block text-sm text-muted mt-0.5">90-second loop, voice coach active</span>
        </button>

        <button
          className="w-full py-4 bg-surface border border-border rounded-xl text-primary font-medium text-left px-5 min-h-touch active:bg-border"
          onClick={() => navigate("/session/protocol")}
        >
          <span className="block text-base">Pre-match protocol</span>
          <span className="block text-sm text-muted mt-0.5">5-minute ritual before competition</span>
        </button>

        <button
          className="w-full py-4 bg-surface border border-border rounded-xl text-primary font-medium text-left px-5 min-h-touch active:bg-border"
          onClick={() => navigate("/session/reset")}
        >
          <span className="block text-base">Reset</span>
          <span className="block text-sm text-muted mt-0.5">After a loss or bad practice</span>
        </button>
      </div>

      {/* Settings */}
      <button
        className="mt-auto text-muted text-sm"
        onClick={() => navigate("/settings")}
      >
        Settings
      </button>
    </div>
  );
}
