import { useNavigate } from "react-router-dom";

export default function Settings() {
  const navigate = useNavigate();

  // TODO: Phase 8 — load athlete from DO, wire form submits to /api/athlete/:id

  return (
    <div className="flex flex-col h-full bg-background px-6 py-10">
      <div className="flex items-center gap-4 mb-10">
        <button className="text-muted text-sm" onClick={() => navigate(-1)}>
          ← Back
        </button>
        <h1 className="text-primary font-medium">Settings</h1>
      </div>

      <div className="flex flex-col gap-6">
        {/* Weight update */}
        <div>
          <label className="block text-muted text-xs uppercase tracking-widest mb-2">
            Current weight (lbs)
          </label>
          <input
            type="number"
            step="0.1"
            placeholder="e.g. 171.4"
            className="w-full bg-surface border border-border rounded-lg px-4 py-3 text-primary text-base focus:outline-none focus:border-accent"
          />
        </div>

        {/* Competition date */}
        <div>
          <label className="block text-muted text-xs uppercase tracking-widest mb-2">
            Competition date
          </label>
          <input
            type="date"
            className="w-full bg-surface border border-border rounded-lg px-4 py-3 text-primary text-base focus:outline-none focus:border-accent"
          />
        </div>

        {/* Opponent intel */}
        <div>
          <label className="block text-muted text-xs uppercase tracking-widest mb-2">
            Opponent name
          </label>
          <input
            type="text"
            placeholder="e.g. Jake Reynolds"
            className="w-full bg-surface border border-border rounded-lg px-4 py-3 text-primary text-base focus:outline-none focus:border-accent mb-3"
          />
          <label className="block text-muted text-xs uppercase tracking-widest mb-2">
            Tendencies / notes
          </label>
          <textarea
            rows={3}
            placeholder="e.g. Heavy double leg, slow starter, gasses after minute 4"
            className="w-full bg-surface border border-border rounded-lg px-4 py-3 text-primary text-base focus:outline-none focus:border-accent resize-none"
          />
        </div>

        <button className="w-full py-4 bg-primary text-background font-semibold rounded-xl min-h-touch mt-2">
          Save
        </button>
      </div>
    </div>
  );
}
