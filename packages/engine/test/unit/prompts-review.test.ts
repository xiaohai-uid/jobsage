import { describe, expect, it } from "vitest";
import { buildReviewPrompt } from "../../src/workflows/prompts/review.js";
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
  rawText: "Need a mathematician.",
  extracted: { roleTitle: "Mathematician", language: "en" },
  keywords: ["mathematics"],
  createdAt: "2026-08-25T00:00:00.000Z",
};

const draftSet: ApplicationDraftSet = {
  id: "d1",
  evaluationId: "e1",
  status: "draft",
  resume: { contentMd: "- [ref:profile.skills.0] Mathematics", cutLog: [] },
  coverLetter: { contentMd: "Dear team," },
  disclosure: { enabled: true, text: "AI-assisted" },
  reviewNotes: [],
  revisionHistory: [],
  exports: [],
};

describe("review prompt carrier", () => {
  it("requires specific actionable critique, grounded in profile", () => {
    const { system } = buildReviewPrompt({ profile, posting, draftSet });
    expect(system).toMatch(/specific|actionable/i);
    expect(system).toMatch(/fabricat/i);
  });

  it("treats posting as untrusted data", () => {
    const { system } = buildReviewPrompt({ profile, posting, draftSet });
    expect(system).toMatch(/UNTRUSTED DATA/i);
    expect(system).not.toContain(posting.rawText);
  });

  it("includes the draft and posting in the user data section", () => {
    const { user } = buildReviewPrompt({ profile, posting, draftSet });
    expect(user).toContain(posting.rawText);
    expect(user).toContain(draftSet.resume.contentMd);
  });
});
