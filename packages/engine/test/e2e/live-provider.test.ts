import { describe, expect, it } from "vitest";
import { OpenAiCompatibleLlmAdapter } from "../../src/adapters/openai-compatible.js";
import { resolveProvider } from "../../src/adapters/providers.js";
import { FixedClock, SequentialIdGenerator } from "../../src/adapters/mock.js";
import { evaluateFit } from "../../src/workflows/evaluate.js";
import { draftApplication } from "../../src/workflows/draft.js";
import type { CandidateProfile, JobPosting } from "../../src/domain/schemas.js";
import { FitEvaluationSchema } from "../../src/domain/schemas.js";

/**
 * Real-inference e2e, env-gated: runs only when JOBSAGE_TEST_LIVE=1 AND a
 * domestic provider key is present. Offline CI skips by design (constitution V).
 */
const LIVE = process.env.JOBSAGE_TEST_LIVE === "1";
const hasKey = Boolean(
  process.env.DEEPSEEK_API_KEY ||
    process.env.DASHSCOPE_API_KEY ||
    process.env.ZHIPU_API_KEY,
);
const gated = LIVE && hasKey ? describe : describe.skip;

const profile: CandidateProfile = {
  id: "profile",
  name: "Ada Lovelace",
  contact: { email: "ada@example.com" },
  education: [],
  experiences: [],
  skills: ["Mathematics"],
  portfolioLinks: [],
  locale: "en",
  version: 1,
};

const posting: JobPosting = {
  id: "p1",
  source: "user-paste",
  rawText: "Need a mathematician.",
  extracted: { roleTitle: "Mathematician", language: "en" },
  keywords: ["mathematics"],
  createdAt: "2026-08-25T00:00:00.000Z",
};

gated("live domestic provider (env-gated)", () => {
  it("evaluate → draft end-to-end with a real model", async () => {
    const providerId =
      (process.env.DEEPSEEK_API_KEY ? "deepseek" : process.env.DASHSCOPE_API_KEY ? "qwen" : "glm") as
        | "deepseek"
        | "qwen"
        | "glm";
    const model = process.env.JOBSAGE_LIVE_MODEL;
    const adapter = new OpenAiCompatibleLlmAdapter({
      meta: resolveProvider(providerId),
      ...(model ? { model } : {}),
    });
    const deps = {
      llm: adapter,
      pdfRenderer: null as never,
      ids: new SequentialIdGenerator("live"),
      clock: new FixedClock(new Date("2026-08-25T00:00:00.000Z")),
    };
    const evaluation = await evaluateFit({ profile, posting }, deps);
    expect(FitEvaluationSchema.safeParse(evaluation).success).toBe(true);
    const set = await draftApplication({ evaluation, profile, posting }, deps);
    expect(set.status).toBe("draft");
    expect(set.resume.contentMd.length).toBeGreaterThan(0);
  }, 120_000);
});