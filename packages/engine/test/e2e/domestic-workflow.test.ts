import { describe, expect, it, vi } from "vitest";
import { OpenAiCompatibleLlmAdapter } from "../../src/adapters/openai-compatible.js";
import { resolveProvider } from "../../src/adapters/providers.js";
import { FixedClock, SequentialIdGenerator } from "../../src/adapters/mock.js";
import { evaluateFit } from "../../src/workflows/evaluate.js";
import { draftApplication } from "../../src/workflows/draft.js";
import type { CandidateProfile, JobPosting } from "../../src/domain/schemas.js";
import { FitEvaluationSchema } from "../../src/domain/schemas.js";

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

const evaluationJson = JSON.stringify({
  overall: { verdict: "ok", score: 3 },
  dimensions: [
    { name: "Technical Skills Match", score: 4, evidence: "Math" },
    { name: "Experience Match", score: 3, evidence: "Related" },
    { name: "Behavioral/Culture Fit", score: 3, evidence: "Fine" },
    { name: "Location & Logistics", score: 3, evidence: "Remote" },
    { name: "Career Alignment & Motivation", score: 3, evidence: "Aligned" },
  ],
  strengths: ["Math"],
  gaps: [{ item: "K8s", honestMissing: true }],
  recommendation: "Proceed.",
});

const resumeJson = JSON.stringify({
  resumeBullets: [
    {
      text: "Mathematics",
      sourceRef: "profile.skills.0",
      relevance: 0.9,
      uniqueness: 0.8,
      coverLetterDependent: true,
    },
  ],
});

describe("domestic adapter through workflows (offline)", () => {
  it("evaluate → draft via OpenAiCompatibleLlmAdapter with mock fetch", async () => {
    const responses = [evaluationJson, resumeJson, "I will bring math to your models."];
    const fetchMock = vi.fn(async () => {
      const text = responses.shift() ?? "{}";
      return new Response(JSON.stringify({ choices: [{ message: { content: text } }] }), {
        status: 200,
      });
    }) as unknown as typeof fetch;

    process.env.DEEPSEEK_API_KEY = "sk-test";
    try {
      const adapter = new OpenAiCompatibleLlmAdapter({
        meta: resolveProvider("deepseek"),
        fetchImpl: fetchMock,
      });
      const deps = {
        llm: adapter,
        pdfRenderer: null as never,
        ids: new SequentialIdGenerator("e2e"),
        clock: new FixedClock(new Date("2026-08-25T00:00:00.000Z")),
      };
      const evaluation = await evaluateFit({ profile, posting }, deps);
      expect(FitEvaluationSchema.safeParse(evaluation).success).toBe(true);
      expect(evaluation.dimensions).toHaveLength(5);

      const set = await draftApplication({ evaluation, profile, posting }, deps);
      expect(set.status).toBe("draft");
      expect(set.resume.contentMd).toContain("[ref:profile.skills.0]");
    } finally {
      delete process.env.DEEPSEEK_API_KEY;
    }
  });
});