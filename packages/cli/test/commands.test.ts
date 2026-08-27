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

  it("export --format html writes a standalone HTML file", async () => {
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
    process.env.JOBSAGE_MOCK_RESPONSES = JSON.stringify([
      JSON.stringify(mockEvaluation),
      resumeJson,
      "I will bring mathematical precision to your models.",
    ]);
    await main(["init", "--file", sampleProfile]);
    await main(["posting", "add", "--file", sampleJd]);
    const postingId = lastJson<{ data: { postingId: string } }>().data.postingId;
    await main(["evaluate", "--posting", postingId]);
    const evaluationId = lastJson<{ data: { evaluationId: string } }>().data.evaluationId;
    await main(["draft", "--evaluation", evaluationId]);
    const draftSetId = lastJson<{ data: { draftSetId: string } }>().data.draftSetId;

    const outPath = join(dir, "resume.html");
    const code = await main(["export", "--draft", draftSetId, "--format", "html", "--out", outPath]);
    expect(code).toBe(ExitCode.OK);
    const html = await readFile(outPath, "utf8");
    expect(html).toContain("<!doctype html>");
    expect(html).toContain("ada@example.com");
  });

  it("export --format pdf exits ENGINE(4) when renderer is unavailable offline", async () => {
    if (process.env.JOBSAGE_TEST_RENDER === "1") return; // real browser may succeed
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
    process.env.JOBSAGE_MOCK_RESPONSES = JSON.stringify([
      JSON.stringify(mockEvaluation),
      resumeJson,
      "I will bring mathematical precision to your models.",
    ]);
    await main(["init", "--file", sampleProfile]);
    await main(["posting", "add", "--file", sampleJd]);
    const postingId = lastJson<{ data: { postingId: string } }>().data.postingId;
    await main(["evaluate", "--posting", postingId]);
    const evaluationId = lastJson<{ data: { evaluationId: string } }>().data.evaluationId;
    await main(["draft", "--evaluation", evaluationId]);
    const draftSetId = lastJson<{ data: { draftSetId: string } }>().data.draftSetId;

    const outPath = join(dir, "resume.pdf");
    const code = await main(["export", "--draft", draftSetId, "--format", "pdf", "--out", outPath]);
    if (code === ExitCode.ENGINE) {
      // Renderer unavailable (e.g., no browser): the error path is correct.
      await expect(readFile(outPath)).rejects.toThrow();
    } else {
      // Browser available: PDF export must succeed with PDF magic bytes.
      expect(code).toBe(ExitCode.OK);
      const pdf = await readFile(outPath);
      expect(pdf.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    }
  });

  it("evaluate with domestic provider and no key exits CONFIG(3) with env hint", async () => {
    process.env.JOBSAGE_WORKSPACE = dir;
    delete process.env.JOBSAGE_PROVIDER;
    delete process.env.DEEPSEEK_API_KEY;
    await main(["init", "--file", sampleProfile]);
    const addOut = await main(["posting", "add", "--file", sampleJd]);
    expect(addOut).toBe(ExitCode.OK);
    const postingId = lastJson<{ data: { postingId: string } }>().data.postingId;

    const code = await main(["evaluate", "--posting", postingId, "--provider", "deepseek"]);
    expect(code).toBe(ExitCode.CONFIG);
    const out = lastJson<{ ok: boolean; error: { hint?: string } }>();
    expect(out.ok).toBe(false);
    expect(out.error.hint).toContain("DEEPSEEK_API_KEY");
  });

  it("runs full China market workflow end-to-end with Chinese profile, JD, evaluate, draft, and review", async () => {
    process.env.JOBSAGE_WORKSPACE = dir;
    process.env.JOBSAGE_PROVIDER = "mock";

    const mockEvalZh = {
      overall: { verdict: "strong", score: 5 },
      dimensions: [
        { name: "skills", score: 5, evidence: "精通 TypeScript/React/Node.js" },
        { name: "exp", score: 5, evidence: "一线互联网大厂架构师经验" },
        { name: "resp", score: 5, evidence: "主导设计系统与性能调优" },
        { name: "seniority", score: 5, evidence: "清华硕士，5+年资历匹配" },
        { name: "stack", score: 5, evidence: "技术栈高度契合" },
      ],
      strengths: ["清华硕士", "头部互联网大厂前端架构师", "设计系统与性能优化深厚积累"],
      gaps: [],
      recommendation: "重点突出微前端中台与大型组件库落地收益",
    };

    const mockResumeZh = JSON.stringify({
      contentMd: "# 陈思齐\n\n## 核心经历\n- 主导设计系统，复用率提升 35%\n- 构建优化，打包耗时降低 60%",
      cuts: [],
    });

    const mockCoverZh = JSON.stringify({
      coverLetterMd: "尊敬的招聘负责人：您好！关注到贵司正在招聘资深前端架构师...",
      greeting: {
        platform: "boss",
        openerText: "您好！看到贵司正在招聘资深前端架构师，我具备6年大厂前端中台与性能优化经验，主导过跨业务设计系统建设。非常期待与您沟通！",
        coreMatches: ["6年大厂架构经验", "设计系统专家"],
        wordCount: 78,
      },
    });

    process.env.JOBSAGE_MOCK_RESPONSES = JSON.stringify([
      JSON.stringify(mockEvalZh),
      mockResumeZh,
      mockCoverZh,
    ]);

    const sampleProfileZh = join(process.cwd(), "examples", "profile-zh-sample.yaml");
    const sampleJdBoss = join(process.cwd(), "examples", "jd-boss-sample.txt");

    // 1. init
    const initCode = await main(["init", "--file", sampleProfileZh]);
    expect(initCode).toBe(ExitCode.OK);

    // 2. posting add
    const addCode = await main(["posting", "add", "--file", sampleJdBoss, "--market", "china"]);
    expect(addCode).toBe(ExitCode.OK);
    const postingData = lastJson<{ data: { postingId: string; extracted: { language: string; roleTitle?: string } } }>();
    expect(postingData.data.extracted.language).toBe("zh");
    expect(postingData.data.extracted.roleTitle).toContain("架构师");
    const postingId = postingData.data.postingId;

    // 3. evaluate
    const evalCode = await main(["evaluate", "--posting", postingId, "--market", "china"]);
    expect(evalCode).toBe(ExitCode.OK);
    const evaluationId = lastJson<{ data: { evaluationId: string; verdict: string } }>().data.evaluationId;

    // 4. draft
    process.env.JOBSAGE_MOCK_RESPONSES = JSON.stringify([
      mockResumeZh,
      mockCoverZh,
    ]);
    const draftCode = await main(["draft", "--evaluation", evaluationId, "--market", "china"]);
    expect(draftCode).toBe(ExitCode.OK);
    const draftSetId = lastJson<{ data: { draftSetId: string; greeting?: string } }>().data.draftSetId;

    const greetingPath = join(dir, "applications", draftSetId, "greeting.txt");
    const greetingContent = await readFile(greetingPath, "utf8");
    expect(greetingContent).toContain("资深前端架构师");

    // 5. export
    const outPath = join(dir, "resume-zh.html");
    const exportCode = await main(["export", "--draft", draftSetId, "--format", "html", "--out", outPath]);
    expect(exportCode).toBe(ExitCode.OK);
    const html = await readFile(outPath, "utf8");
    expect(html).toContain("陈思齐");
  });
});
