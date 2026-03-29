import { useNavigate } from "react-router-dom";
import WeightDisplay from "../components/WeightDisplay";

export default function Dashboard() {
  const navigate = useNavigate();

  // TODO: Phase 4 — load athlete data from /api/athlete/:id
  const athlete = null as null | { name: string; currentWeight: number; targetWeight: number; competitionDate: string };

  return (
    <div className="flex flex-col h-full bg-background px-6 py-10">
      <h1 className="text-xl font-semibold text-primary mb-1">
        {athlete?.name ?? "IronMind"}
      </h1>

      {/* Current cut status */}
      {athlete && (
        <WeightDisplay
          currentWeight={athlete.currentWeight}
          targetWeight={athlete.targetWeight}
          competitionDate={athlete.competitionDate}
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
