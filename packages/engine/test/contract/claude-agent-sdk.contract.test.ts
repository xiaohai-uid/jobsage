import { describe, expect, it } from "vitest";
import { ClaudeAgentSdkLlmAdapter } from "../../src/adapters/claude-agent-sdk.js";

/**
 * ClaudeAgentSdkLlmAdapter — env-gated live contract test.
 * Runs only when JOBSAGE_TEST_LIVE=1 AND ANTHROPIC_API_KEY is set (real
 * inference costs tokens). Offline CI skips by design (constitution V).
 */
const gated =
  process.env.JOBSAGE_TEST_LIVE === "1" && process.env.ANTHROPIC_API_KEY
    ? describe
    : describe.skip;

gated("ClaudeAgentSdkLlmAdapter contract", () => {
  it("generates text from a trivial prompt", async () => {
    const llm = new ClaudeAgentSdkLlmAdapter();
    const { text } = await llm.generate({
      system: "You are a terse assistant. Reply with exactly: OK",
      user: "",
    });
    expect(text.toUpperCase()).toContain("OK");
  }, 30_000);

  it("treats generateIsolated as a fresh context (can answer a simple probe)", async () => {
    const llm = new ClaudeAgentSdkLlmAdapter();
    const { text } = await llm.generateIsolated({
      system: "Reply with exactly: fresh",
      user: "",
    });
    expect(text.toLowerCase()).toContain("fresh");
  }, 30_000);
});