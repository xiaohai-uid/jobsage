import { describe, expect, it } from "vitest";
import { ENGINE_NAME, ENGINE_VERSION } from "../src/index.js";

describe("engine smoke", () => {
  it("exposes name and version", () => {
    expect(ENGINE_NAME).toBe("jobsage-engine");
    expect(ENGINE_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
