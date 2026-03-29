import Waveform from "../components/Waveform";
import PushToTalk from "../components/PushToTalk";

// Minimal by design — just waveform and push-to-talk on dark background.
// This is a private space. Nothing else belongs here.
export default function Reset() {
  const isAgentSpeaking = false;

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex-1 flex items-center justify-center">
        <Waveform active={isAgentSpeaking} />
      </div>

      <div className="flex justify-center pb-safe px-6">
        <PushToTalk onSpeech={(transcript) => {
          // TODO: Phase 6 — send to /api/reset/message
          console.log("athlete said:", transcript);
        }} />
      </div>
    </div>
  );
}
