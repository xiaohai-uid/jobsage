import { describe, expect, it } from "vitest";
import {
  ApplicationDraftSetSchema,
  CandidateProfileSchema,
  FitEvaluationSchema,
  JobPostingSchema,
} from "../../src/domain/schemas.js";

const validProfile = {
  id: "profile",
  name: "Ada Lovelace",
  contact: { email: "ada@example.com", phone: "+1 555 0100", location: "London" },
  education: [
    {
      institution: "University of London",
      degree: "BSc Mathematics",
      field: "Mathematics",
      start: "1832",
      highlights: ["Analytical engine work"],
    },
  ],
  experiences: [
    {
      org: "Analytical Engines Ltd",
      title: "Mathematician",
      start: "1833",
      end: "1843",
      bullets: ["Translated and expanded Menabrea's notes"],
    },
  ],
  skills: ["Mathematics", "Algorithmic thinking"],
  portfolioLinks: [{ label: "Notes", url: "https://example.com/notes" }],
  writingStyleSample: "I prefer precise, measured prose.",
  behavioral: { discType: "C", motivations: ["impact"], workStyle: "methodical" },
  locale: "en",
  version: 1,
};

const validPosting = {
  id: "01J0ABC",
  source: "user-paste",
  rawText: "Senior Algorithm Engineer at Example Corp.",
  extracted: {
    company: "Example Corp",
    roleTitle: "Senior Algorithm Engineer",
    language: "en",
  },
  keywords: ["algorithms", "mathematics"],
  createdAt: "2026-08-25T00:00:00.000Z",
};

describe("domain invariants (constitution II/III)", () => {
  it("rejects an ApplicationDraftSet with any status other than literal 'draft'", () => {
    const draft = {
      id: "01J0DRAFT",
      evaluationId: "01J0EVAL",
      status: "sent", // ← must be impossible
      resume: { contentMd: "# Resume", cutLog: [] },
      coverLetter: { contentMd: "Dear team," },
      disclosure: { enabled: true, text: "AI-assisted" },
      reviewNotes: [],
      revisionHistory: [],
      exports: [],
    };
    const result = ApplicationDraftSetSchema.safeParse(draft);
    expect(result.success).toBe(false);
  });

  it("accepts an ApplicationDraftSet with status exactly 'draft'", () => {
    const draft = {
      id: "01J0DRAFT",
      evaluationId: "01J0EVAL",
      status: "draft",
      resume: { contentMd: "# Resume", cutLog: [] },
      coverLetter: { contentMd: "Dear team," },
      disclosure: { enabled: true, text: "AI-assisted" },
      reviewNotes: [],
      revisionHistory: [],
      exports: [],
    };
    const result = ApplicationDraftSetSchema.safeParse(draft);
    expect(result.success).toBe(true);
  });

  it("requires every gap to be honestMissing:true", () => {
    const evaluation = {
      id: "01J0EVAL",
      postingId: "01J0ABC",
      profileVersion: 1,
      overall: { verdict: "ok", score: 3 },
      dimensions: [
        { name: "skills", score: 4, evidence: "Core match" },
        { name: "experience", score: 3, evidence: "Relevant" },
        { name: "culture", score: 3, evidence: "Fine" },
        { name: "location", score: 3, evidence: "OK" },
        { name: "career", score: 3, evidence: "OK" },
      ],
      strengths: ["Algorithms"],
      gaps: [{ item: "Kubernetes", honestMissing: false }], // ← must be true
      recommendation: "Proceed cautiously",
      createdAt: "2026-08-25T00:00:00.000Z",
    };
    const result = FitEvaluationSchema.safeParse(evaluation);
    expect(result.success).toBe(false);
  });

  it("requires exactly five evaluation dimensions", () => {
    const evaluation = {
      id: "01J0EVAL",
      postingId: "01J0ABC",
      profileVersion: 1,
      overall: { verdict: "ok", score: 3 },
      dimensions: [{ name: "skills", score: 4, evidence: "Core match" }], // only 1
      strengths: [],
      gaps: [],
      recommendation: "Proceed",
      createdAt: "2026-08-25T00:00:00.000Z",
    };
    const result = FitEvaluationSchema.safeParse(evaluation);
    expect(result.success).toBe(false);
  });

  it("requires profile version to be a positive integer", () => {
    const bad = { ...validProfile, version: 0 };
    const result = CandidateProfileSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it("requires posting source to be user-paste (P0 no scraping)", () => {
    const bad = { ...validPosting, source: "scraper" };
    const result = JobPostingSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it("requires posting raw text to be non-empty verbatim input", () => {
    const bad = { ...validPosting, rawText: "" };
    const result = JobPostingSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });
});
