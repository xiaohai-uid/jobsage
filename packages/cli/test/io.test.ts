import { describe, expect, it } from "vitest";
import {
  ExitCode,
  fail,
  ok,
  SCHEMA_VERSION,
  serializeEnvelope,
} from "../src/io.js";

describe("CLI JSON envelope", () => {
  it("builds a success envelope", () => {
    const env = ok({ hello: "world" });
    expect(env.schemaVersion).toBe(SCHEMA_VERSION);
    expect(env.ok).toBe(true);
    expect(env.data).toEqual({ hello: "world" });
    expect(env.error).toBeNull();
  });

  it("builds a failure envelope with machine code", () => {
    const env = fail(ExitCode.CONFIG, "Missing API key", "export ANTHROPIC_API_KEY=...");
    expect(env.ok).toBe(false);
    expect(env.error.code).toBe("E3");
    expect(env.error.hint).toContain("ANTHROPIC_API_KEY");
  });

  it("serializes deterministically", () => {
    const json = serializeEnvelope(ok({ a: 1 }));
    expect(JSON.parse(json)).toEqual({
      schemaVersion: 1,
      ok: true,
      data: { a: 1 },
      error: null,
    });
  });
});
