/**
 * draftApplication workflow — FitEvaluation + profile + posting →
 * ApplicationDraftSet (status is always "draft"; constitution Principle II).
 *
 * Deterministic core: the LLM proposes relevance/uniqueness/dependency scores
 * per bullet; the engine applies rankForCutting (cut-score.ts) to enforce
 * MAX_RESUME_BULLETS, producing an auditable cutLog. This keeps the
 * "relevance-weighted cutting" promise testable offline.
 */
import { z } from "zod";
import type { ApplicationDraftSet, CandidateProfile, FitEvaluation, JobPosting } from "../domain/schemas.js";
import { ApplicationDraftSetSchema } from "../domain/schemas.js";
import { rankForCutting } from "../domain/cut-score.js";
import type { EngineDeps } from "../ports/index.js";
import { ProfileVersionMismatchError, SchemaViolationError } from "../ports/index.js";
import { buildCoverPrompt } from "./prompts/draft-cover.js";
import { MAX_RESUME_BULLETS, buildResumePrompt } from "./prompts/draft-resume.js";

export const DEFAULT_DISCLOSURE_TEXT =
  "This material was prepared with AI assistance. The candidate is responsible for its accuracy.";

const ResumeBulletsSchema = z.object({
  resumeBullets: z.array(
    z.object({
      text: z.string().min(1),
      sourceRef: z.string().min(1),
      relevance: z.number().min(0).max(1),
      uniqueness: z.number().min(0).max(1),
      coverLetterDependent: z.boolean(),
    }),
  ),
});

export interface DraftInput {
  evaluation: FitEvaluation;
  profile: CandidateProfile;
  posting: JobPosting;
}

function parseJsonLoose(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return JSON.parse(fenced ? fenced[1]! : trimmed) as unknown;
}

function assembleResumeMd(
  name: string,
  bullets: Array<{ text: string; sourceRef: string }>,
): string {
  const lines = bullets.map((b) => `- [ref:${b.sourceRef}] ${b.text}`);
  return `# ${name}\n\n${lines.join("\n")}\n`;
}

export async function draftApplication(
  input: DraftInput,
  deps: EngineDeps,
): Promise<ApplicationDraftSet> {
  const { evaluation, profile, posting } = input;
  if (profile.version !== evaluation.profileVersion) {
    throw new ProfileVersionMismatchError(
      `Profile version ${profile.version} does not match evaluation version ${evaluation.profileVersion}`,
    );
  }

  const resumePrompt = buildResumePrompt({ profile, posting, evaluation });
  let bullets: z.infer<typeof ResumeBulletsSchema>["resumeBullets"] | null = null;
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 2 && bullets === null; attempt += 1) {
    const { text } = await deps.llm.generate(resumePrompt);
    try {
      const parsed = ResumeBulletsSchema.safeParse(parseJsonLoose(text));
      if (parsed.success) {
        bullets = parsed.data.resumeBullets;
      } else {
        lastError = parsed.error;
      }
    } catch (err) {
      lastError = err;
    }
  }
  if (bullets === null) {
    throw new SchemaViolationError(
      `Resume output failed schema validation after one retry: ${String(lastError)}`,
    );
  }

  // Deterministic relevance-weighted cutting (upstream 05-cv-templates rule).
  const cutLog: ApplicationDraftSet["resume"]["cutLog"] = [];
  let kept = bullets;
  if (bullets.length > MAX_RESUME_BULLETS) {
    const ranked = rankForCutting(
      bullets.map((b, i) => ({
        id: String(i),
        relevance: b.relevance,
        uniqueness: b.uniqueness,
        coverLetterDependent: b.coverLetterDependent,
      })),
    );
    const keepIdx = new Set(ranked.slice(-MAX_RESUME_BULLETS).map((c) => Number(c.id)));
    kept = bullets.filter((_, i) => keepIdx.has(i));
    const removed = bullets.filter((_, i) => !keepIdx.has(i));
    for (const b of removed) {
      cutLog.push({
        removedLine: b.text,
        reason: "Lowest relevance-weighted score",
        scoreBreakdown: {
          relevance: b.relevance,
          uniqueness: b.uniqueness,
          coverLetterDependent: b.coverLetterDependent,
        },
      });
    }
  }

  const coverPrompt = buildCoverPrompt({ profile, posting, evaluation });
  let coverText: string | null = null;
  for (let attempt = 0; attempt < 2 && coverText === null; attempt += 1) {
    const { text } = await deps.llm.generate(coverPrompt);
    if (text.trim().length > 0) {
      coverText = text.trim();
    } else {
      lastError = new Error("empty cover letter output");
    }
  }
  if (coverText === null) {
    throw new SchemaViolationError(`Cover letter output empty after one retry: ${String(lastError)}`);
  }

  const draftSet = {
    id: deps.ids.next(),
    evaluationId: evaluation.id,
    status: "draft" as const,
    resume: {
      contentMd: assembleResumeMd(profile.name, kept),
      cutLog,
    },
    coverLetter: { contentMd: coverText },
    disclosure: { enabled: true, text: DEFAULT_DISCLOSURE_TEXT },
    reviewNotes: [],
    revisionHistory: [],
    exports: [],
  };
  return ApplicationDraftSetSchema.parse(draftSet);
}
