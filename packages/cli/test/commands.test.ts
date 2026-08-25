import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { main } from "../src/index.js";
import { ExitCode } from "../src/io.js";

let dir: string;
let logSpy: ReturnType<typeof vi.spyOn>;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "jobsage-cli-"));
  process.exitCode = 0;
  logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(async () => {
  logSpy.mockRestore();
  delete process.env.JOBSAGE_WORKSPACE;
  delete process.env.JOBSAGE_PROVIDER;
  delete process.env.JOBSAGE_MOCK_RESPONSES;
  await rm(dir, { recursive: true, force: true });
});

function lastJson<T>(): T {
  const calls = logSpy.mock.calls.map((c) => c[0]).filter((s): s is string => typeof s === "string");
  const last = calls[calls.length - 1];
  if (!last) throw new Error("no console.log output captured");
  return JSON.parse(last) as T;
}

const sampleProfile = join(process.cwd(), "examples", "profile-sample.yaml");
const sampleJd = join(process.cwd(), "examples", "jd-sample.txt");

const mockEvaluation = {
  overall: { verdict: "ok", score: 3 },
  dimensions: [
    { name: "Technical Skills Match", score: 4, evidence: "Mathematics is a primary skill" },
    { name: "Experience Match", score: 3, evidence: "Related analytical work" },
    { name: "Behavioral/Culture Fit", score: 3, evidence: "Methodical style" },
    { name: "Location & Logistics", score: 3, evidence: "London-based, hybrid OK" },
    { name: "Career Alignment & Motivation", score: 3, evidence: "Aligned" },
  ],
  strengths: ["Mathematics", "Technical writing"],
  gaps: [{ item: "Kubernetes", honestMissing: true }],
  recommendation: "Proceed with tailored draft.",
};

describe("CLI US1 commands", () => {
  it("init imports a YAML profile into the workspace", async () => {
    process.env.JOBSAGE_WORKSPACE = dir;
    const code = await main(["init", "--file", sampleProfile]);
    expect(code).toBe(ExitCode.OK);
    const profile = JSON.parse(
      await readFile(join(dir, "profile", "profile.json"), "utf8"),
    ) as { name: string; version: number };
    expect(profile.name).toBe("Ada Lovelace");
    expect(profile.version).toBe(1);
  });

  it("posting add stores the raw text verbatim and returns an id", async () => {
    process.env.JOBSAGE_WORKSPACE = dir;
    await main(["init", "--file", sampleProfile]);
    const code = await main(["posting", "add", "--file", sampleJd]);
    expect(code).toBe(ExitCode.OK);
    const out = lastJson<{ ok: boolean; data: { postingId: string } }>();
    expect(out.ok).toBe(true);
    const raw = await readFile(join(dir, "postings", out.data.postingId, "raw.txt"), "utf8");
    expect(raw).toContain("Senior Algorithm Engineer");
  });

  it("evaluate writes an evaluation under mock provider", async () => {
    process.env.JOBSAGE_WORKSPACE = dir;
    process.env.JOBSAGE_PROVIDER = "mock";
    process.env.JOBSAGE_MOCK_RESPONSES = JSON.stringify([JSON.stringify(mockEvaluation)]);
    await main(["init", "--file", sampleProfile]);
    const addOut = await main(["posting", "add", "--file", sampleJd]);
    expect(addOut).toBe(ExitCode.OK);
    const postingId = lastJson<{ data: { postingId: string } }>().data.postingId;

    const code = await main(["evaluate", "--posting", postingId]);
    expect(code).toBe(ExitCode.OK);
    const out = lastJson<{ data: { evaluationId: string; verdict: string } }>();
    expect(out.data.verdict).toBe("ok");
    const evalFile = JSON.parse(
      await readFile(join(dir, "evaluations", out.data.evaluationId, "evaluation.json"), "utf8"),
    ) as { dimensions: unknown[]; profileVersion: number };
    expect(evalFile.dimensions).toHaveLength(5);
    expect(evalFile.profileVersion).toBe(1);
  });

  it("evaluate exits CONFIG(3) when claude-agent-sdk provider has no API key", async () => {
    process.env.JOBSAGE_WORKSPACE = dir;
    delete process.env.JOBSAGE_PROVIDER;
    delete process.env.ANTHROPIC_API_KEY;
    await main(["init", "--file", sampleProfile]);
    const addOut = await main(["posting", "add", "--file", sampleJd]);
    expect(addOut).toBe(ExitCode.OK);
    const postingId = lastJson<{ data: { postingId: string } }>().data.postingId;

    const code = await main(["evaluate", "--posting", postingId]);
    expect(code).toBe(ExitCode.CONFIG);
    const out = lastJson<{ ok: boolean; error: { code: string; hint?: string } }>();
    expect(out.ok).toBe(false);
    expect(out.error.code).toBe("E3");
    expect(out.error.hint).toContain("ANTHROPIC_API_KEY");
  });

  it("draft writes a draft-set, resume.md and cover-letter.md under mock provider", async () => {
    process.env.JOBSAGE_WORKSPACE = dir;
    process.env.JOBSAGE_PROVIDER = "mock";
    const resumeJson = JSON.stringify({
      resumeBullets: [
        {
          text: "Translated Menabrea's notes",
          sourceRef: "profile.experiences.0.bullets.0",
          relevance: 0.9,
          uniqueness: 0.8,
          coverLetterDependent: true,
        },
        {
          text: "Published the first machine algorithm",
          sourceRef: "profile.experiences.0.bullets.1",
          relevance: 0.9,
          uniqueness: 0.9,
          coverLetterDependent: false,
        },
      ],
    });
    process.env.JOBSAGE_MOCK_RESPONSES = JSON.stringify([
      JSON.stringify(mockEvaluation),
      resumeJson,
      "I will bring mathematical precision to your models.",
    ]);
    await main(["init", "--file", sampleProfile]);
    const addOut = await main(["posting", "add", "--file", sampleJd]);
    expect(addOut).toBe(ExitCode.OK);
    const postingId = lastJson<{ data: { postingId: string } }>().data.postingId;
    const evalCode = await main(["evaluate", "--posting", postingId]);
    expect(evalCode).toBe(ExitCode.OK);
    const evaluationId = lastJson<{ data: { evaluationId: string } }>().data.evaluationId;

    process.env.JOBSAGE_MOCK_RESPONSES = JSON.stringify([
      resumeJson,
      "I will bring mathematical precision to your models.",
    ]);
    const code = await main(["draft", "--evaluation", evaluationId]);
    expect(code).toBe(ExitCode.OK);
    const out = lastJson<{ data: { draftSetId: string; cutCount: number; disclosureEnabled: boolean } }>();
    expect(out.data.cutCount).toBe(0);
    expect(out.data.disclosureEnabled).toBe(true);
    const resume = await readFile(
      join(dir, "applications", out.data.draftSetId, "resume.md"),
      "utf8",
    );
    expect(resume).toMatch(/\[ref:profile\.experiences/);
  });

  it("review --revise applies isolated reviewer notes and records history", async () => {
    process.env.JOBSAGE_WORKSPACE = dir;
    process.env.JOBSAGE_PROVIDER = "mock";
    const resumeJson = JSON.stringify({
      resumeBullets: [
        {
          text: "Translated Menabrea's notes",
          sourceRef: "profile.experiences.0.bullets.0",
          relevance: 0.9,
          uniqueness: 0.8,
          coverLetterDependent: true,
        },
      ],
    });
    const notesJson = JSON.stringify({
      reviewNotes: [
        {
          dimension: "keyword",
          issue: "Missing algorithmic language",
          suggestion: "Emphasize algorithmic thinking",
        },
      ],
    });
    const reviseJson = JSON.stringify({
      resumeMd: "- [ref:profile.experiences.0.bullets.0] Translated Menabrea's notes\n- [ref:profile.skills.1] Algorithmic thinking",
      coverLetterMd: "Dear team,\n\nI will bring algorithmic thinking to your models.",
    });
    process.env.JOBSAGE_MOCK_RESPONSES = JSON.stringify([
      JSON.stringify(mockEvaluation),
      resumeJson,
      "I will bring mathematical precision to your models.",
      reviseJson,
    ]);
    process.env.JOBSAGE_MOCK_ISOLATED_RESPONSES = JSON.stringify([notesJson]);

    await main(["init", "--file", sampleProfile]);
    const addOut = await main(["posting", "add", "--file", sampleJd]);
    expect(addOut).toBe(ExitCode.OK);
    const postingId = lastJson<{ data: { postingId: string } }>().data.postingId;
    await main(["evaluate", "--posting", postingId]);
    const evaluationId = lastJson<{ data: { evaluationId: string } }>().data.evaluationId;
    await main(["draft", "--evaluation", evaluationId]);
    const draftSetId = lastJson<{ data: { draftSetId: string } }>().data.draftSetId;

    process.env.JOBSAGE_MOCK_RESPONSES = JSON.stringify([reviseJson]);
    process.env.JOBSAGE_MOCK_ISOLATED_RESPONSES = JSON.stringify([notesJson]);
    const code = await main(["review", "--draft", draftSetId, "--revise"]);
    expect(code).toBe(ExitCode.OK);
    const out = lastJson<{ data: { notesCount: number; revised: boolean; revisionHistoryCount: number } }>();
    expect(out.data.notesCount).toBe(1);
    expect(out.data.revised).toBe(true);
    expect(out.data.revisionHistoryCount).toBe(1);

    const draftFile = JSON.parse(
      await readFile(join(dir, "applications", draftSetId, "draft-set.json"), "utf8"),
    ) as { reviewNotes: unknown[]; revisionHistory: unknown[]; resume: { contentMd: string } };
    expect(draftFile.reviewNotes).toHaveLength(1);
    expect(draftFile.revisionHistory).toHaveLength(1);
    expect(draftFile.resume.contentMd).toContain("Algorithmic thinking");
  });
});
