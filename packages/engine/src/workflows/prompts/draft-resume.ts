/**
 * Resume draft prompt — semantic port of upstream
 * `.claude/skills/job-application-assistant/05-cv-templates.md`
 * (relevance-weighted tailoring rules) with LaTeX layout instructions
 * replaced by structured bullet output for the engine's deterministic
 * cutting logic. Divergence recorded in research.md R6.
 */
import type { CandidateProfile, FitEvaluation, JobPosting } from "../../domain/schemas.js";

export interface DraftResumeInput {
  profile: CandidateProfile;
  posting: JobPosting;
  evaluation: FitEvaluation;
}

export const MAX_RESUME_BULLETS = 10;

const RESUME_SYSTEM = `You are an expert CV tailor. Rewrite the candidate's real experience into bullets tailored to the job posting.

Output a single JSON object (no markdown fences):
{
  "resumeBullets": [
    {
      "text": string,
      "sourceRef": string,
      "relevance": number (0..1),
      "uniqueness": number (0..1),
      "coverLetterDependent": boolean
    }
  ]
}

Rules:
- Every bullet MUST be grounded in the candidate profile. NEVER fabricate, invent, or embellish achievements that are not in the profile.
- Every bullet MUST include a "sourceRef" pointing to the exact profile field it came from, using bracket notation like "profile.experiences.0.bullets.0".
- Tailor by emphasizing the most relevant real content for this posting. Reorder and rephrase, but do not change facts.
- "relevance" = how important this bullet is to the posting. "uniqueness" = how distinctive this content is vs typical candidates. "coverLetterDependent" = true if the cover letter references this bullet.
- If there are more bullets than needed, provide the strongest candidates; the engine applies deterministic relevance-weighted cutting using these scores.`;

export function buildResumePrompt(input: DraftResumeInput): { system: string; user: string } {
  return {
    system: RESUME_SYSTEM,
    user: `CANDIDATE PROFILE (JSON):
${JSON.stringify(input.profile, null, 2)}

EVALUATION:
${JSON.stringify(input.evaluation, null, 2)}

--- UNTRUSTED JOB POSTING ---
${input.posting.rawText}

Produce the JSON now.`,
  };
}
