import Anthropic from "@anthropic-ai/sdk";
import type { Env } from "../types";

// Calls Claude through Cloudflare AI Gateway.
// The gateway URL already has /anthropic at the end — the SDK appends the rest.
export async function callClaude(
  env: Env,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const client = new Anthropic({
    apiKey: env.ANTHROPIC_API_KEY,
    baseURL: env.CF_AI_GATEWAY_URL,
  });

  const message = await client.messages.create({
    model: env.CLAUDE_MODEL,
    max_tokens: 256,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const block = message.content[0];
  if (!block || block.type !== "text") {
    throw new Error("Unexpected response from Claude — no text block");
  }

  return block.text.trim();
}
