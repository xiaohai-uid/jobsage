import { describe, expect, it } from "vitest";
import {
  FixedClock,
  MockLlmAdapter,
  SequentialIdGenerator,
} from "../../src/adapters/mock.js";
import type { EngineDeps } from "../../src/ports/index.js";
import { draftApplication } from "../../src/workflows/draft.js";
import { evaluateFit } from "../../src/workflows/evaluate.js";
import type { CandidateProfile, JobPosting } from "../../src/domain/schemas.js";

const profile: CandidateProfile = {
  id: "profile",
  name: "Ada Lovelace",
  contact: { email: "ada@example.com" },
  education: [],
  experiences: [
    {
      org: "Analytical Engines Ltd",
      title: "Mathematician",
      start: "1833",
      bullets: [
        "Translated Menabrea's notes",
        "Published the first machine algorithm",
      ],
    },
    {
      org: "Example Corp",
      title: "Analyst",
      start: "1844",
      bullets: ["Built numerical models"],
    },
  ],
  skills: ["Mathematics", "Algorithmic thinking"],
  portfolioLinks: [],
  locale: "en",
  version: 1,
};

const posting: JobPosting = {
  id: "p1",
  source: "user-paste",
  rawText: "Senior Algorithm Engineer at Example Corp.",
  extracted: { roleTitle: "Senior Algorithm Engineer", language: "en" },
  keywords: ["algorithms"],
  createdAt: "2026-08-25T00:00:00.000Z",
};

const evaluationJson = JSON.stringify({
  overall: { verdict: "strong", score: 4 },
  dimensions: [
    { name: "Technical Skills Match", score: 5, evidence: "Mathematics" },
    { name: "Experience Match", score: 4, evidence: "Analytical" },
    { name: "Behavioral/Culture Fit", score: 4, evidence: "Methodical" },
    { name: "Location & Logistics", score: 4, evidence: "London" },
    { name: "Career Alignment & Motivation", score: 4, evidence: "Aligned" },
  ],
  strengths: ["Mathematics"],
  gaps: [{ item: "Kubernetes", honestMissing: true }],
  recommendation: "Proceed.",
});

const resumeJson = JSON.stringify({
  resumeBullets: [
    {
      text: "Translated Menabrea's notes on the Analytical Engine",
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
    {
      text: "Built numerical models at Example Corp",
      sourceRef: "profile.experiences.1.bullets.0",
      relevance: 0.8,
      uniqueness: 0.6,
      coverLetterDependent: true,
    },
  ],
});

const coverMd = "I will bring mathematical precision to your algorithms.";

function resolvePath(root: unknown, path: string): unknown {
  const parts = path
    .replace(/\[(\d+)\]/g, ".$1")
    .split(".")
    .filter(Boolean);
  if (parts[0] === "profile") parts.shift(); // root is already the profile
  let current: unknown = root;
  for (const part of parts) {
    if (typeof current !== "object" || current === null) return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function deps(llm: MockLlmAdapter): EngineDeps {
  return {
    llm,
    pdfRenderer: null as never,
    ids: new SequentialIdGenerator("e2e"),
    clock: new FixedClock(new Date("2026-08-25T00:00:00.000Z")),
  };
}

describe("US2 offline end-to-end chain (SC-3 fact provenance)", () => {
  it("evaluate → draft with every resume sourceRef resolvable in the profile", async () => {
    const llm = new MockLlmAdapter([evaluationJson, resumeJson, coverMd]);
    const evaluation = await evaluateFit({ profile, posting }, deps(llm));
    const set = await draftApplication({ evaluation, profile, posting }, deps(llm));

    const refs = [...set.resume.contentMd.matchAll(/\[ref:([^\]]+)\]/g)].map(
      (m) => m[1]!,
    );
    expect(refs.length).toBeGreaterThan(0);
    for (const ref of refs) {
      expect(resolvePath(profile, ref), `unresolvable sourceRef ${ref}`).toBeDefined();
    }
    expect(set.status).toBe("draft");
    expect(set.coverLetter.contentMd).toContain("mathematical precision");
  });
});
