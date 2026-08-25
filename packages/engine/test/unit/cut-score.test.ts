import { describe, expect, it } from "vitest";
import { rankForCutting, scoreLine } from "../../src/domain/cut-score.js";

describe("cut-score (upstream relevance-weighted cutting, R6)", () => {
  it("scores relevance as the dominant factor", () => {
    const highRelevance = scoreLine({ relevance: 0.8, uniqueness: 0.2, coverLetterDependent: false });
    const lowRelevance = scoreLine({ relevance: 0.6, uniqueness: 0.8, coverLetterDependent: false });
    expect(highRelevance).toBeGreaterThan(lowRelevance);
  });

  it("boosts lines the cover letter depends on", () => {
    const dependent = scoreLine({ relevance: 0.6, uniqueness: 0.2, coverLetterDependent: true });
    const independent = scoreLine({ relevance: 0.7, uniqueness: 0.2, coverLetterDependent: false });
    // Even with lower relevance, dependency keeps the line above.
    expect(dependent).toBeGreaterThan(independent);
  });

  it("orders worst-first for cutting", () => {
    const lines = [
      { id: "a", relevance: 0.9, uniqueness: 0.9, coverLetterDependent: false },
      { id: "b", relevance: 0.1, uniqueness: 0.1, coverLetterDependent: false },
      { id: "c", relevance: 0.5, uniqueness: 0.5, coverLetterDependent: true },
    ];
    const ranked = rankForCutting(lines);
    expect(ranked[0]?.id).toBe("b");
    expect(ranked[2]?.id).toBe("a");
  });

  it("is deterministic for equal scores (stable by original order)", () => {
    const lines = [
      { id: "x", relevance: 0.5, uniqueness: 0.5, coverLetterDependent: false },
      { id: "y", relevance: 0.5, uniqueness: 0.5, coverLetterDependent: false },
    ];
    const ranked = rankForCutting(lines);
    expect(ranked.map((l) => l.id)).toEqual(["x", "y"]);
  });
});
