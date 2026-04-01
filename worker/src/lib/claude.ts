import Anthropic from "@anthropic-ai/sdk";
import type { Env } from "../types";

// Calls Claude through Cloudflare AI Gateway.
// The gateway URL already has /anthropic at the end — the SDK appends the rest.
export async function callClaude(
  env: Env,
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 256
): Promise<string> {
  const client = new Anthropic({
    apiKey: env.ANTHROPIC_API_KEY,
    ...(env.CF_AI_GATEWAY_URL ? { baseURL: env.CF_AI_GATEWAY_URL } : {}),
  });

  const message = await client.messages.create({
    model: env.CLAUDE_MODEL,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const block = message.content[0];
  if (!block || block.type !== "text") {
    throw new Error("Unexpected response from Claude — no text block");
  }

  return block.text.trim();
}

// Calls Claude with a full conversation history (for ElevenLabs LLM endpoint).
// The messages array contains the full prior turns from ElevenLabs.
export async function callClaudeWithHistory(
  env: Env,
  systemPrompt: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>
): Promise<string> {
  const client = new Anthropic({
    apiKey: env.ANTHROPIC_API_KEY,
    ...(env.CF_AI_GATEWAY_URL ? { baseURL: env.CF_AI_GATEWAY_URL } : {}),
  });

  const message = await client.messages.create({
    model: env.CLAUDE_MODEL,
    max_tokens: 512,
    system: systemPrompt,
    messages,
  });

  const block = message.content[0];
  if (!block || block.type !== "text") {
    throw new Error("Unexpected response from Claude — no text block");
  }

  return block.text.trim();
}

// Streams Claude's response as OpenAI-compatible SSE.
// ElevenLabs requires streaming to start TTS as tokens arrive.
export function streamClaudeWithHistory(
  env: Env,
  systemPrompt: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>
): ReadableStream<Uint8Array> {
  const client = new Anthropic({
    apiKey: env.ANTHROPIC_API_KEY,
    ...(env.CF_AI_GATEWAY_URL ? { baseURL: env.CF_AI_GATEWAY_URL } : {}),
  });

  const encoder = new TextEncoder();
  const id = `chatcmpl-${crypto.randomUUID()}`;

  return new ReadableStream({
    async start(controller) {
      try {
        const stream = await client.messages.create({
          model: env.CLAUDE_MODEL,
          max_tokens: 512,
          system: systemPrompt,
          messages,
          stream: true,
        });

        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            const chunk = {
              id,
              object: "chat.completion.chunk",
              model: env.CLAUDE_MODEL,
              choices: [{ index: 0, delta: { content: event.delta.text }, finish_reason: null }],
            };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
          } else if (event.type === "message_delta" && event.delta.stop_reason) {
            const finalChunk = {
              id,
              object: "chat.completion.chunk",
              model: env.CLAUDE_MODEL,
              choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
            };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(finalChunk)}\n\n`));
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          }
        }
      } catch (err) {
        const errorChunk = encoder.encode(`data: ${JSON.stringify({ error: String(err) })}\n\n`);
        controller.enqueue(errorChunk);
      } finally {
        controller.close();
      }
    },
  });
}
