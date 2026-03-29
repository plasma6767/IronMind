interface WeightDisplayProps {
  currentWeight: number;
  targetWeight: number;
  competitionDate?: string;
  compact?: boolean;
}

export default function WeightDisplay({
  currentWeight,
  targetWeight,
  competitionDate,
  compact = false,
}: WeightDisplayProps) {
  const remaining = Math.max(0, currentWeight - targetWeight);
  const daysLeft = competitionDate
    ? Math.ceil((new Date(competitionDate).getTime() - Date.now()) / 86_400_000)
    : null;

  if (compact) {
    return (
      <div className="flex items-baseline gap-3 mb-4">
        <span className="text-2xl font-semibold text-primary font-mono">
          {currentWeight.toFixed(1)}
        </span>
        <span className="text-muted text-sm">
          -{remaining.toFixed(1)} to {targetWeight}
        </span>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-border rounded-xl p-4 mt-6">
      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-3xl font-semibold text-primary font-mono">
          {currentWeight.toFixed(1)}
        </span>
        <span className="text-muted text-sm">lbs</span>
      </div>

      <div className="flex items-center gap-3 text-sm">
        <span className="text-muted">
          {remaining.toFixed(1)} lbs to {targetWeight}
        </span>
        {daysLeft !== null && (
          <>
            <span className="text-border">·</span>
            <span className="text-muted">{daysLeft}d out</span>
          </>
        )}
      </div>
    </div>
  );
}
