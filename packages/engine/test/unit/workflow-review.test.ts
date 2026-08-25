import { describe, expect, it } from "vitest";
import {
  FixedClock,
  MockLlmAdapter,
  SequentialIdGenerator,
} from "../../src/adapters/mock.js";
import type { EngineDeps } from "../../src/ports/index.js";
import { reviewAndRevise } from "../../src/workflows/review-revise.js";
import type {
  ApplicationDraftSet,
  CandidateProfile,
  JobPosting,
} from "../../src/domain/schemas.js";

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
  rawText: "Need a mathematician with Kubernetes.",
  extracted: { roleTitle: "Mathematician", language: "en" },
  keywords: ["mathematics", "kubernetes"],
  createdAt: "2026-08-25T00:00:00.000Z",
};

const draftSet: ApplicationDraftSet = {
  id: "d1",
  evaluationId: "e1",
  status: "draft",
  resume: {
    contentMd: "- [ref:profile.skills.0] Mathematics",
    cutLog: [],
  },
  coverLetter: { contentMd: "Dear team,\n\nI know math." },
  disclosure: { enabled: true, text: "AI-assisted" },
  reviewNotes: [],
  revisionHistory: [],
  exports: [],
};

const notesJson = JSON.stringify({
  reviewNotes: [
    {
      dimension: "keyword",
      issue: "Missing Kubernetes mention",
      suggestion: "If the candidate knows it, add it; otherwise state the gap.",
    },
    {
      dimension: "framing",
      issue: "Cover letter is too short",
      suggestion: "Add forward-looking contribution sentence.",
    },
  ],
});

const reviseJson = JSON.stringify({
  resumeMd:
    "- [ref:profile.skills.0] Mathematics\n- [ref:profile.skills.0] Algorithmic thinking",
  coverLetterMd: "Dear team,\n\nI will bring mathematical precision and growth to your models.",
});

function deps(llm: MockLlmAdapter): EngineDeps {
  return {
    llm,
    pdfRenderer: null as never,
    ids: new SequentialIdGenerator("rev"),
    clock: new FixedClock(new Date("2026-08-25T00:00:00.000Z")),
  };
}

describe("reviewAndRevise workflow", () => {
  it("review-only appends notes and keeps revision history unchanged", async () => {
    const llm = new MockLlmAdapter([notesJson]);
    const out = await reviewAndRevise({ profile, posting, draftSet, mode: "review-only" }, deps(llm));
    expect(out.reviewNotes).toHaveLength(2);
    expect(out.reviewNotes.every((n) => n.resolvedAt === undefined)).toBe(true);
    expect(out.revisionHistory).toEqual([]);
    expect(llm.isolatedCount).toBe(1);
  });

  it("review-and-revise resolves notes, updates drafts and records history", async () => {
    const llm = new MockLlmAdapter([reviseJson], {
      isolatedScript: [notesJson],
    });
    const out = await reviewAndRevise(
      { profile, posting, draftSet, mode: "review-and-revise" },
      deps(llm),
    );
    expect(out.reviewNotes).toHaveLength(2);
    expect(out.reviewNotes.every((n) => n.resolvedAt !== undefined)).toBe(true);
    expect(out.revisionHistory).toHaveLength(1);
    expect(out.revisionHistory[0]?.basedOnNotes).toBe(2);
    expect(out.resume.contentMd).toContain("Algorithmic thinking");
    expect(out.coverLetter.contentMd).toContain("mathematical precision and growth");
    // Reviewer ran isolated; drafter ran normal generate.
    expect(llm.isolatedCount).toBe(1);
    expect(llm.generateCount).toBe(1);
  });
});
