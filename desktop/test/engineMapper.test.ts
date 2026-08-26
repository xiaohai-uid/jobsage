import { describe, expect, it } from "vitest";
import {
  mapEvaluationToResult,
  mapProfileToUi,
  scoreToPercent,
  verdictLabel,
} from "../src/engineMapper.js";

describe("engine → UI mappers", () => {
  it("maps verdict labels and scores to the 0-100 scale", () => {
    expect(verdictLabel("strong")).toBe("Strong match");
    expect(verdictLabel("weak")).toBe("Weak match");
    expect(scoreToPercent(4)).toBe(80);
    expect(scoreToPercent(6)).toBe(100);
  });

  it("maps an engine evaluation into the UI result shape", () => {
    const result = mapEvaluationToResult({
      id: "e1",
      overall: { verdict: "ok", score: 3 },
      dimensions: [
        { name: "Technical Skills Match", score: 4 },
        { name: "Experience Match", score: 3 },
        { name: "Behavioral/Culture Fit", score: 4 },
        { name: "Location & Logistics", score: 3 },
        { name: "Career Alignment & Motivation", score: 4 },
      ],
      strengths: ["Mathematics"],
      gaps: [{ item: "Kubernetes" }],
      recommendation: "Proceed.",
    });
    expect(result.verdict).toBe("ok");
    expect(result.score).toBe(60);
    expect(result.dims).toHaveLength(5);
    expect(result.gaps[0]).toContain("Kubernetes");
  });

  it("maps an engine profile to the UI profile", () => {
    const ui = mapProfileToUi(
      {
        name: "Ada Lovelace",
        contact: { email: "ada@example.com", location: "London" },
        education: [{ institution: "UoL", degree: "BSc", field: "Math", start: "1832" }],
        experiences: [
          { org: "AEL", title: "Mathematician", start: "1833", bullets: ["First algorithm"] },
        ],
        skills: ["Math"],
        version: 2,
      },
      "now",
    );
    expect(ui.name).toBe("Ada Lovelace");
    expect(ui.experience[0].company).toBe("AEL");
    expect(ui.education[0].school).toBe("UoL");
    expect(ui.version).toBe(2);
  });
});