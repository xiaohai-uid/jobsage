import { describe, expect, it } from "vitest";
import type { LlmPort, LlmRequest } from "../../src/ports/index.js";
import { SchemaViolationError } from "../../src/ports/index.js";
import { FixedClock, MockLlmAdapter, SequentialIdGenerator } from "../../src/adapters/mock.js";
import { evaluateFit } from "../../src/workflows/evaluate.js";
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
  version: 3,
};

const posting: JobPosting = {
  id: "p1",
  source: "user-paste",
  rawText: "Need a mathematician who can also do Kubernetes.",
  extracted: { roleTitle: "Mathematician", language: "en" },
  keywords: ["mathematics", "kubernetes"],
  createdAt: "2026-08-25T00:00:00.000Z",
};

const validEvaluationJson = JSON.stringify({
  id: "ignored-by-parser",
  postingId: "ignored-by-parser",
  profileVersion: 3,
  overall: { verdict: "ok", score: 3 },
  dimensions: [
    { name: "Technical Skills Match", score: 4, evidence: "Mathematics is a primary skill" },
    { name: "Experience Match", score: 3, evidence: "Related domain" },
    { name: "Behavioral/Culture Fit", score: 3, evidence: "Matches style" },
    { name: "Location & Logistics", score: 3, evidence: "Remote OK" },
    { name: "Career Alignment & Motivation", score: 3, evidence: "Aligns" },
  ],
  strengths: ["Mathematics"],
  gaps: [{ item: "Kubernetes", honestMissing: true }],
  recommendation: "Proceed with a tailored draft.",
});

class CapturingLlm implements LlmPort {
  requests: LlmRequest[] = [];
  constructor(private readonly responses: string[]) {}
  async generate(req: LlmRequest): Promise<{ text: string }> {
    this.requests.push(req);
    const text = this.responses.shift() ?? "{}";
    return { text };
  }
  async generateIsolated(req: LlmRequest): Promise<{ text: string }> {
    this.requests.push(req);
    const text = this.responses.shift() ?? "{}";
    return { text };
  }
}

function deps(llm: LlmPort) {
  return {
    llm,
    pdfRenderer: null as never,
    ids: new SequentialIdGenerator("eval"),
    clock: new FixedClock(new Date("2026-08-25T00:00:00.000Z")),
  };
}

describe("evaluateFit workflow", () => {
  it("returns a schema-valid evaluation with five dimensions and profile version", async () => {
    const llm = new CapturingLlm([validEvaluationJson]);
    const evaluation = await evaluateFit({ profile, posting }, deps(llm));
    expect(FitEvaluationSchema.safeParse(evaluation).success).toBe(true);
    expect(evaluation.dimensions).toHaveLength(5);
    expect(evaluation.profileVersion).toBe(3);
  });

  it("passes the raw posting to the LLM in the user data section", async () => {
    const llm = new CapturingLlm([validEvaluationJson]);
    await evaluateFit({ profile, posting }, deps(llm));
    expect(llm.requests[0]?.user).toContain(posting.rawText);
  });

  it("retries once on invalid output then throws SchemaViolationError", async () => {
    const llm = new CapturingLlm(["not json", "still bad"]);
    await expect(evaluateFit({ profile, posting }, deps(llm))).rejects.toBeInstanceOf(
      SchemaViolationError,
    );
    expect(llm.requests).toHaveLength(2); // one retry, then hard fail
  });

  it("recovers from a first invalid attempt when the retry is valid", async () => {
    const llm = new CapturingLlm(["garbage", validEvaluationJson]);
    const evaluation = await evaluateFit({ profile, posting }, deps(llm));
    expect(FitEvaluationSchema.safeParse(evaluation).success).toBe(true);
    expect(llm.requests).toHaveLength(2);
  });

  it("works with the deterministic MockLlmAdapter for offline CI", async () => {
    const llm = new MockLlmAdapter([validEvaluationJson]);
    const evaluation = await evaluateFit({ profile, posting }, deps(llm));
    expect(FitEvaluationSchema.safeParse(evaluation).success).toBe(true);
  });
});
