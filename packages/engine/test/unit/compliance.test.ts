import { describe, expect, it } from "vitest";
import {
  findForbiddenTransports,
  findSendLikeExports,
} from "../../../../tools/compliance-check.mjs";

describe("compliance scan functions", () => {
  it("flags generic network transports in non-whitelisted files", () => {
    const src = "import axios from 'axios';\nconst r = fetch('/api');";
    const found = findForbiddenTransports(src, "packages/engine/src/x.ts");
    expect(found).toContain("axios");
    expect(found).toContain("fetch");
  });

  it("allows the SDK import only inside the whitelisted adapter", () => {
    const src = "import { query } from '@anthropic-ai/claude-agent-sdk';";
    expect(findForbiddenTransports(src, "packages/engine/src/adapters/claude-agent-sdk.ts")).toEqual([]);
    expect(findForbiddenTransports(src, "packages/engine/src/workflows/evaluate.ts").length).toBeGreaterThan(0);
  });

  it("flags send-like exported functions in the engine public surface", () => {
    expect(findSendLikeExports("export function sendApplication(){}")).toContain("sendApplication");
    expect(findSendLikeExports("export function evaluateFit(){}")).toEqual([]);
  });
});