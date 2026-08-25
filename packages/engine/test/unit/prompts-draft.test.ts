import { describe, expect, it } from "vitest";
import { buildCoverPrompt } from "../../src/workflows/prompts/draft-cover.js";
import { buildResumePrompt } from "../../src/workflows/prompts/draft-resume.js";
import type { CandidateProfile, FitEvaluation, JobPosting } from "../../src/domain/schemas.js";

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

describe("draft prompt carriers (upstream fidelity R6)", () => {
  it("resume prompt requires sourceRef grounding and forbids fabrication", () => {
    const { system } = buildResumePrompt({ profile, posting, evaluation });
    expect(system).toMatch(/sourceRef/);
    expect(system).toMatch(/fabricat|invent/i);
    expect(system).toMatch(/relevance/);
    expect(system).toMatch(/uniqueness/);
  });

  it("resume prompt puts posting only in user data (untrusted)", () => {
    const { system, user } = buildResumePrompt({ profile, posting, evaluation });
    expect(user).toContain(posting.rawText);
    expect(system).not.toContain(posting.rawText);
  });

  it("cover prompt enforces one page and forward-looking framing", () => {
    const { system } = buildCoverPrompt({ profile, posting, evaluation });
    expect(system).toMatch(/one page|ONE page|single-page/i);
    expect(system).toMatch(/forward-looking/i);
    expect(system).toMatch(/fabricat|invent/i);
  });
});
