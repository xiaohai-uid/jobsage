import { describe, expect, it } from "vitest";
import { MockLlmAdapter } from "../../src/adapters/mock.js";

/**
 * LlmPort contract — exercised against the mock adapter so CI is offline.
 * Contract: specs/001-engine-core/contracts/engine-api.md
 */
describe("LlmPort contract (MockLlmAdapter)", () => {
  it("returns scripted deterministic output", async () => {
    const llm = new MockLlmAdapter(["first", "second"]);
    const a = await llm.generate({ system: "s", user: "u" });
    const b = await llm.generate({ system: "s", user: "u" });
    expect(a.text).toBe("first");
    expect(b.text).toBe("second");
  });

  it("treats generate and generateIsolated as independent contexts", async () => {
    const llm = new MockLlmAdapter(["g1", "i1", "g2"]);
    await llm.generate({ system: "s", user: "u" });
    await llm.generateIsolated({ system: "s", user: "u" });
    await llm.generate({ system: "s", user: "u" });
    // Separate counters prove no shared context bleeding (US3 reviewer isolation).
    expect(llm.generateCount).toBe(2);
    expect(llm.isolatedCount).toBe(1);
  });

  it("falls back to a deterministic generated response when script is exhausted", async () => {
    const llm = new MockLlmAdapter(["only"]);
    await llm.generate({ system: "s", user: "u" });
    const out = await llm.generate({ system: "s", user: "u" });
    expect(out.text).toMatch(/^mock generate #1$/);
  });
});
