import { describe, expect, it } from "vitest";
import {
  ACTION_TYPES,
  appReducer,
  initialState,
  type AppState,
} from "../../src/state/appReducer.js";

describe("app reducer (constitution II/FR-9)", () => {
  it("starts a command and rejects a second concurrent command", () => {
    const s1 = appReducer(initialState, {
      type: "command.started",
      command: "evaluate",
      startedAt: "2026-08-25T00:00:00Z",
    });
    expect(s1.pending?.command).toBe("evaluate");

    const s2 = appReducer(s1, {
      type: "command.started",
      command: "draft",
      startedAt: "2026-08-25T00:00:01Z",
    });
    expect(s2.pending?.command).toBe("evaluate"); // unchanged
  });

  it("clears pending on success and stores the result", () => {
    const state: AppState = { ...initialState, pending: { command: "evaluate", startedAt: "t" } };
    const next = appReducer(state, {
      type: "command.succeeded",
      result: { ok: true, data: { verdict: "ok" } },
    });
    expect(next.pending).toBeNull();
    expect(next.lastResult).toEqual({ ok: true, data: { verdict: "ok" } });
  });

  it("clears pending on failure and stores error with hint", () => {
    const state: AppState = { ...initialState, pending: { command: "evaluate", startedAt: "t" } };
    const next = appReducer(state, {
      type: "command.failed",
      code: "E3",
      message: "ANTHROPIC_API_KEY is not set",
      hint: "export ANTHROPIC_API_KEY=...",
    });
    expect(next.pending).toBeNull();
    expect(next.lastResult?.error?.code).toBe("E3");
    expect(next.lastResult?.error?.hint).toContain("ANTHROPIC_API_KEY");
  });

  it("edits and saves draft fields", () => {
    const draft = {
      draftSetId: "d1",
      resumeMd: "# Ada",
      coverLetterMd: "Dear team",
      cutLog: [],
      disclosure: { enabled: true, text: "AI-assisted" },
    };
    const loaded = appReducer(initialState, { type: "draft.loaded", draft });
    const edited = appReducer(loaded, {
      type: "draft.edited",
      field: "resumeMd",
      content: "# Ada Lovelace",
    });
    expect(edited.draft?.resumeMd).toBe("# Ada Lovelace");
    expect(edited.draft?.coverLetterMd).toBe("Dear team");
  });

  it("exposes no send/submit/publish action types (SC-6)", () => {
    const bad = ACTION_TYPES.filter((t) => /send|submit|publish|apply-to-platform/i.test(t));
    expect(bad).toEqual([]);
  });
});