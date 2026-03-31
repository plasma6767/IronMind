import type { Env } from "../env";

const ELEVENLABS_BASE = "https://api.elevenlabs.io/v1";

// Clone a voice from a raw audio blob.
// The ElevenLabs API expects multipart/form-data with a name and one or more audio files.
// Returns the new voice_id to store in the athlete's DO.
export async function cloneVoice(
  env: Env,
  athleteName: string,
  audioBlob: Blob
): Promise<string> {
  const form = new FormData();
  form.append("name", `IronMind — ${athleteName}`);
  form.append("files", audioBlob, "sample.mp3");

  const res = await fetch(`${ELEVENLABS_BASE}/voices/add`, {
    method: "POST",
    headers: { "xi-api-key": env.ELEVENLABS_API_KEY },
    body: form,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`ElevenLabs voice clone failed (${res.status}): ${err}`);
  }

  const data = await res.json<{ voice_id: string }>();
  return data.voice_id;
}

// Synthesize speech using ElevenLabs TTS.
// Returns raw MP3 bytes — no caching here; caching lives at the route level.
export async function synthesizeSpeech(
  env: Env,
  text: string,
  voiceId: string
): Promise<ArrayBuffer> {
  const res = await fetch(`${ELEVENLABS_BASE}/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "xi-api-key": env.ELEVENLABS_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      model_id: env.ELEVENLABS_TTS_MODEL,
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`ElevenLabs TTS failed (${res.status}): ${err}`);
  }

  return res.arrayBuffer();
}
