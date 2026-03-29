import Waveform from "../components/Waveform";
import PushToTalk from "../components/PushToTalk";

// Steps: basic profile → goals → mental profile → identity anchors → voice clone → current cut
const STEPS = [
  "Basic profile",
  "Goals",
  "Mental profile",
  "Identity anchors",
  "Voice clone",
  "Current cut",
] as const;

export default function Onboarding() {
  // TODO: Phase 7
  // - Track current step index
  // - Wire PushToTalk → POST /api/onboarding/message
  // - Render agent waveform when speaking
  // - Show step progress indicator
  // - On completion, navigate to /dashboard

  const currentStep = 0;
  const isAgentSpeaking = false;

  return (
    <div className="flex flex-col h-full bg-background px-6 py-10">
      {/* Step progress */}
      <div className="flex gap-1.5 mb-10">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className={`h-0.5 flex-1 rounded-full ${i <= currentStep ? "bg-primary" : "bg-border"}`}
          />
        ))}
      </div>

      {/* Step label */}
      <p className="text-muted text-sm mb-2">{STEPS[currentStep]}</p>

      {/* Waveform — active when agent is speaking */}
      <div className="flex-1 flex items-center justify-center">
        <Waveform active={isAgentSpeaking} />
      </div>

      {/* Push to talk */}
      <div className="flex justify-center pb-safe">
        <PushToTalk onSpeech={(transcript) => {
          // TODO: send transcript to /api/onboarding/message
          console.log("transcript:", transcript);
        }} />
      </div>
    </div>
  );
}
