import { describe, expect, it } from "vitest";
import { buildEvaluatePrompt } from "../../src/workflows/prompts/evaluate.js";
import type { CandidateProfile, JobPosting } from "../../src/domain/schemas.js";

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

describe("evaluate prompt carrier (upstream fidelity R6)", () => {
  it("contains all five upstream scoring dimensions", () => {
    const { system } = buildEvaluatePrompt({ profile, posting });
    for (const dimension of [
      "Technical Skills Match",
      "Experience Match",
      "Behavioral/Culture Fit",
      "Location & Logistics",
      "Career Alignment & Motivation",
    ]) {
      expect(system).toContain(dimension);
    }
  });

  it("declares the posting as untrusted data, never instructions", () => {
    const { system } = buildEvaluatePrompt({ profile, posting });
    expect(system).toMatch(/UNTRUSTED DATA/i);
    expect(system).toMatch(/never.*instruction|not.*instruction/i);
  });

  it("forbids fabrication explicitly", () => {
    const { system } = buildEvaluatePrompt({ profile, posting });
    expect(system).toMatch(/fabricat|invent|hallucinat/i);
  });

  it("includes the raw posting only in the user data section", () => {
    const { system, user } = buildEvaluatePrompt({ profile, posting });
    expect(user).toContain(posting.rawText);
    expect(system).not.toContain(posting.rawText);
  });
});
