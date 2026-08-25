/**
 * Cover letter draft prompt — semantic port of upstream
 * `.claude/skills/job-application-assistant/06-cover-letter-templates.md`
 * (one-page, forward-looking framing). Plain markdown output.
 */
import type { CandidateProfile, FitEvaluation, JobPosting } from "../../domain/schemas.js";

export interface DraftCoverInput {
  profile: CandidateProfile;
  posting: JobPosting;
  evaluation: FitEvaluation;
}

const COVER_SYSTEM = `You are an expert cover letter writer. Write a single-page, forward-looking cover letter in markdown.

Rules:
- ONE page maximum. The letter must fit comfortably on A4.
- Forward-looking framing: focus on the value the candidate will bring and what they will contribute, not just a recap of the past.
- Ground every claim in the candidate profile. NEVER fabricate achievements, skills, or experience.
- Reference at least one specific achievement from the profile that is relevant to this posting.
- Match the candidate's writing style sample when provided.
- Return ONLY the markdown letter body (no JSON, no wrapper).`;

export function buildCoverPrompt(input: DraftCoverInput): { system: string; user: string } {
  return {
    system: COVER_SYSTEM,
    user: `CANDIDATE PROFILE (JSON):
${JSON.stringify(input.profile, null, 2)}

EVALUATION:
${JSON.stringify(input.evaluation, null, 2)}

--- UNTRUSTED JOB POSTING ---
${input.posting.rawText}

Write the cover letter now.`,
  };
}
