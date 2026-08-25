/**
 * ClaudeAgentSdkLlmAdapter — real-inference LlmPort adapter.
 * Uses @anthropic-ai/claude-agent-sdk's query() with a fresh session per call,
 * which natively provides the "fresh context" semantics required by
 * generateIsolated (US3 reviewer isolation).
 *
 * Env-gated: tests skip when the configured API key is absent, so CI stays
 * offline and deterministic (constitution Principle III/V).
 */
import { query, type SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import type { LlmPort, LlmRequest } from "../ports/index.js";

async function collectAssistantText(stream: AsyncIterable<SDKMessage>): Promise<string> {
  let text = "";
  for await (const event of stream) {
    if (event.type !== "assistant") continue;
    const content = event.message?.content;
    if (typeof content === "string") {
      text += content;
      continue;
    }
    for (const block of content ?? []) {
      if (block.type === "text" && "text" in block) text += block.text;
    }
  }
  return text.trim();
}

export class ClaudeAgentSdkLlmAdapter implements LlmPort {
  constructor(private readonly apiKeyEnvVar = "ANTHROPIC_API_KEY") {}

  private async run(req: LlmRequest): Promise<{ text: string }> {
    const key = process.env[this.apiKeyEnvVar];
    if (!key) {
      throw new Error(
        `Missing ${this.apiKeyEnvVar}; set it to use the Claude Agent SDK provider.`,
      );
    }
    const stream = query({
      prompt: `${req.system}\n\n--- USER CONTENT ---\n${req.user}`,
      options: {
        allowedTools: [], // P0 workflows are pure generation; no tool use yet
      },
    });
    const text = await collectAssistantText(stream);
    return { text };
  }

  async generate(req: LlmRequest): Promise<{ text: string }> {
    return this.run(req);
  }

  async generateIsolated(req: LlmRequest): Promise<{ text: string }> {
    // A new query() session is a fresh context by construction.
    return this.run(req);
  }
}
