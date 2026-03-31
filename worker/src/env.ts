// Cloudflare Worker bindings — not imported by the frontend
export interface Env {
  ATHLETE_DO: DurableObjectNamespace;
  AUDIO_CACHE: R2Bucket;
  ANTHROPIC_API_KEY: string;
  CF_AI_GATEWAY_URL: string;
  ELEVENLABS_API_KEY: string;
  ELEVENLABS_FALLBACK_VOICE_ID: string;
  CLAUDE_MODEL: string;
  ELEVENLABS_TTS_MODEL: string;
  ENVIRONMENT: string;
}
