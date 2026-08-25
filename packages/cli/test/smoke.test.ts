import { describe, expect, it } from "vitest";

describe("cli smoke", () => {
  it("entry module imports without error", async () => {
    // Import the entry source; it must not throw at module scope.
    // (Side effects guarded: no-arg path writes to stderr + exit(1), which
    // vitest would surface; so assert via dynamic import only.)
    await import("../src/index.js");
    expect(true).toBe(true);
  });

  it("resolves the workspace engine dependency", async () => {
    const engine = await import("@jobsage/engine");
    expect(engine.ENGINE_NAME).toBe("jobsage-engine");
  });
});
