import { describe, expect, it } from "vitest";
import {
  buildDraftArgs,
  buildEvaluateArgs,
  buildExportArgs,
  buildInitArgs,
  buildPostingAddStdioArgs,
  buildReviewArgs,
} from "../src/commands.js";

describe("CLI argv builders (sidecar protocol)", () => {
  it("builds init args with JSON envelope", () => {
    expect(buildInitArgs("/tmp/p.yaml", "/ws")).toEqual([
      "init", "--file", "/tmp/p.yaml", "--workspace", "/ws", "--json",
    ]);
  });

  it("builds posting add via stdin only", () => {
    expect(buildPostingAddStdioArgs("/ws")).toEqual([
      "posting", "add", "--stdin", "--workspace", "/ws", "--json",
    ]);
  });

  it("builds evaluate args", () => {
    expect(buildEvaluateArgs("p1", "/ws", "mock")).toEqual([
      "evaluate", "--posting", "p1", "--workspace", "/ws", "--provider", "mock", "--json",
    ]);
  });

  it("builds draft args", () => {
    expect(buildDraftArgs("e1", "/ws", "mock")).toEqual([
      "draft", "--evaluation", "e1", "--workspace", "/ws", "--provider", "mock", "--json",
    ]);
  });

  it("builds review args with optional revise", () => {
    expect(buildReviewArgs("d1", "/ws", "mock")).not.toContain("--revise");
    expect(buildReviewArgs("d1", "/ws", "mock", true)).toContain("--revise");
  });

  it("builds export args", () => {
    expect(buildExportArgs("d1", "pdf", "/out/a.pdf", "resume", "/ws")).toEqual([
      "export", "--draft", "d1", "--format", "pdf", "--out", "/out/a.pdf",
      "--document", "resume", "--workspace", "/ws", "--json",
    ]);
  });
});