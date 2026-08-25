import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  appendAudit,
  defaultWorkspaceRoot,
  ensureLayout,
  layout,
  readJson,
  writeJson,
} from "../src/workspace.js";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "jobsage-ws-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("workspace layout", () => {
  it("creates the standard directories on ensureLayout", async () => {
    const ws = layout(dir);
    await ensureLayout(ws);
    for (const sub of ["profile", "postings", "evaluations", "applications", "exports"]) {
      const info = await stat(join(ws.root, sub));
      expect(info.isDirectory()).toBe(true);
    }
  });

  it("round-trips a JSON entity file", async () => {
    const ws = layout(dir);
    await ensureLayout(ws);
    const p = join(ws.postingsDir, "p1.json");
    await writeJson(p, { id: "p1", rawText: "hello" });
    await expect(readJson<{ rawText: string }>(p)).resolves.toEqual({
      id: "p1",
      rawText: "hello",
    });
  });

  it("appends audit entries line by line", async () => {
    const ws = layout(dir);
    await ensureLayout(ws);
    await appendAudit(ws, { at: "2026-08-25T00:00:00Z", action: "init" });
    await appendAudit(ws, { at: "2026-08-25T00:00:01Z", action: "export" });
    const log = await readFile(ws.auditLog, "utf8");
    expect(log.trim().split("\n")).toHaveLength(2);
  });

  it("honors JOBSAGE_WORKSPACE env override", () => {
    const prev = process.env.JOBSAGE_WORKSPACE;
    process.env.JOBSAGE_WORKSPACE = "/tmp/custom-ws";
    try {
      expect(defaultWorkspaceRoot()).toBe("/tmp/custom-ws");
    } finally {
      if (prev === undefined) delete process.env.JOBSAGE_WORKSPACE;
      else process.env.JOBSAGE_WORKSPACE = prev;
    }
  });
});
