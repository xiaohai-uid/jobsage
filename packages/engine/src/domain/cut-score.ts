/**
 * Relevance-weighted cutting — pure logic port of upstream
 * `05-cv-templates.md` cutting rules (research.md R6).
 * Each candidate line is scored by (relevance, uniqueness, cover-letter
 * dependency); the lowest-scoring line is cut first. Deterministic and stable.
 */

export interface CutCandidate {
  id: string;
  relevance: number; // 0..1
  uniqueness: number; // 0..1
  coverLetterDependent: boolean;
}

export function scoreLine(input: Omit<CutCandidate, "id">): number {
  const relevance = input.relevance * 0.7;
  const uniqueness = input.uniqueness * 0.2;
  const dependency = input.coverLetterDependent ? 0.1 : 0;
  return relevance + uniqueness + dependency;
}

/** Returns candidates sorted worst-first (lowest score first), stable. */
export function rankForCutting(candidates: readonly CutCandidate[]): CutCandidate[] {
  return candidates
    .map((candidate, index) => ({ candidate, index }))
    .sort((a, b) => {
      const scoreDiff = scoreLine(a.candidate) - scoreLine(b.candidate);
      if (scoreDiff !== 0) return scoreDiff;
      return a.index - b.index;
    })
    .map(({ candidate }) => candidate);
}
