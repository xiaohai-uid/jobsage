import { describe, expect, it } from "vitest";
import { MockLlmAdapter, SequentialIdGenerator, FixedClock } from "../../src/adapters/mock.js";
import type { EngineDeps } from "../../src/ports/index.js";
import { ProfileVersionMismatchError } from "../../src/ports/index.js";
import { draftApplication } from "../../src/workflows/draft.js";
import type { CandidateProfile, FitEvaluation, JobPosting } from "../../src/domain/schemas.js";
import { ApplicationDraftSetSchema } from "../../src/domain/schemas.js";

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
      bullets: ["Wrote the first algorithm for a machine"],
    },
  ],
  skills: ["Mathematics"],
  portfolioLinks: [],
  writingStyleSample: "Precise, measured prose.",
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

const evaluation: FitEvaluation = {
  id: "e1",
  postingId: "p1",
  profileVersion: 1,
  overall: { verdict: "ok", score: 3 },
  dimensions: [],
  strengths: [],
  gaps: [],
  recommendation: "Proceed",
  createdAt: "2026-08-25T00:00:00.000Z",
};

function bullets(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    text: `Bullet ${i}`,
    sourceRef: `profile.experiences.0.bullets.0`,
    relevance: i % 2 === 0 ? 0.9 : 0.1,
    uniqueness: 0.5,
    coverLetterDependent: false,
  }));
}

const coverMd = "Dear team,\n\nI will bring precision and algorithmic thinking to your models.";

function deps(llm: MockLlmAdapter): EngineDeps {
  return {
    llm,
    pdfRenderer: null as never,
    ids: new SequentialIdGenerator("draft"),
    clock: new FixedClock(new Date("2026-08-25T00:00:00.000Z")),
  };
}

describe("draftApplication workflow", () => {
  it("returns a schema-valid draft set with status draft and disclosure", async () => {
    const llm = new MockLlmAdapter([
      JSON.stringify({ resumeBullets: bullets(2) }),
      coverMd,
    ]);
    const set = await draftApplication({ evaluation, profile, posting }, deps(llm));
    expect(ApplicationDraftSetSchema.safeParse(set).success).toBe(true);
    expect(set.status).toBe("draft");
    expect(set.disclosure.enabled).toBe(true);
    expect(set.disclosure.text.length).toBeGreaterThan(0);
    expect(set.reviewNotes).toEqual([]);
    expect(set.revisionHistory).toEqual([]);
    expect(set.exports).toEqual([]);
  });

  it("throws ProfileVersionMismatchError when profile version differs", async () => {
    const llm = new MockLlmAdapter([]);
    const stale = { ...profile, version: 2 };
    await expect(
      draftApplication({ evaluation, profile: stale, posting }, deps(llm)),
    ).rejects.toBeInstanceOf(ProfileVersionMismatchError);
  });

  it("cuts low-scoring bullets beyond MAX_RESUME_BULLETS and records cutLog", async () => {
    const llm = new MockLlmAdapter([
      JSON.stringify({ resumeBullets: bullets(12) }),
      coverMd,
    ]);
    const set = await draftApplication({ evaluation, profile, posting }, deps(llm));
    // 12 bullets with alternating relevance 0.9/0.1 → 6 low + 6 high; max 10 → 2 cut.
    expect(set.resume.cutLog.length).toBeGreaterThanOrEqual(2);
    // Surviving contentMd must include sourceRef annotations.
    expect(set.resume.contentMd).toMatch(/\[ref:profile\.experiences/);
  });

  it("keeps contentMd non-empty and coverLetter non-empty", async () => {
    const llm = new MockLlmAdapter([
      JSON.stringify({ resumeBullets: bullets(1) }),
      coverMd,
    ]);
    const set = await draftApplication({ evaluation, profile, posting }, deps(llm));
    expect(set.resume.contentMd.length).toBeGreaterThan(0);
    expect(set.coverLetter.contentMd).toContain("I will bring precision");
  });
});
