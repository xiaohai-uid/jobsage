/**
 * reviewAndRevise workflow — drafter-reviewer pipeline (US3).
 * The reviewer runs in an ISOLATED fresh context (generateIsolated) as
 * required by the LlmPort contract. Revision is deterministic-after-LLM:
 * notes are appended, resolvedAt stamped, history recorded.
 */
import { z } from "zod";
import type {
  ApplicationDraftSet,
  CandidateProfile,
  JobPosting,
} from "../domain/schemas.js";
import { ApplicationDraftSetSchema } from "../domain/schemas.js";
import type { EngineDeps } from "../ports/index.js";
import { SchemaViolationError } from "../ports/index.js";
import {
  buildReviewPrompt,
  buildRevisePrompt,
} from "./prompts/review.js";

const ReviewNotesSchema = z.object({
  reviewNotes: z.array(
    z.object({
      dimension: z.string().min(1),
      issue: z.string().min(1),
      suggestion: z.string().min(1),
    }),
  ),
});

const ReviseOutputSchema = z.object({
  resumeMd: z.string().min(1),
  coverLetterMd: z.string().min(1),
});

export interface ReviewReviseInput {
  profile: CandidateProfile;
  posting: JobPosting;
  draftSet: ApplicationDraftSet;
  mode: "review-only" | "review-and-revise";
}

function parseJsonLoose(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return JSON.parse(fenced ? fenced[1]! : trimmed) as unknown;
}

export async function reviewAndRevise(
  input: ReviewReviseInput,
  deps: EngineDeps,
): Promise<ApplicationDraftSet> {
  const { draftSet } = input;

  const reviewPrompt = buildReviewPrompt({ profile: input.profile, posting: input.posting, draftSet });
  let notes: z.infer<typeof ReviewNotesSchema>["reviewNotes"] | null = null;
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 2 && notes === null; attempt += 1) {
    const { text } = await deps.llm.generateIsolated(reviewPrompt);
    try {
      const parsed = ReviewNotesSchema.safeParse(parseJsonLoose(text));
      if (parsed.success) notes = parsed.data.reviewNotes;
      else lastError = parsed.error;
    } catch (err) {
      lastError = err;
    }
  }
  if (notes === null) {
    throw new SchemaViolationError(
      `Review output failed schema validation after one retry: ${String(lastError)}`,
    );
  }

  // Immutable append: existing history untouched.
  const appendedNotes: ApplicationDraftSet["reviewNotes"] = [
    ...draftSet.reviewNotes,
    ...notes.map((n) => ({ ...n })),
  ];

  if (input.mode === "review-only") {
    return ApplicationDraftSetSchema.parse({ ...draftSet, reviewNotes: appendedNotes });
  }

  // review-and-revise
  const revisePrompt = buildRevisePrompt({
    profile: input.profile,
    posting: input.posting,
    draftSet,
    reviewNotes: notes,
  });
  let revised: z.infer<typeof ReviseOutputSchema> | null = null;
  for (let attempt = 0; attempt < 2 && revised === null; attempt += 1) {
    const { text } = await deps.llm.generate(revisePrompt);
    try {
      const parsed = ReviseOutputSchema.safeParse(parseJsonLoose(text));
      if (parsed.success) revised = parsed.data;
      else lastError = parsed.error;
    } catch (err) {
      lastError = err;
    }
  }
  if (revised === null) {
    throw new SchemaViolationError(
      `Revise output failed schema validation after one retry: ${String(lastError)}`,
    );
  }

  const nowIso = deps.clock.now().toISOString();
  const resolvedNotes = appendedNotes.map((n) =>
    n.resolvedAt === undefined ? { ...n, resolvedAt: nowIso } : n,
  );

  return ApplicationDraftSetSchema.parse({
    ...draftSet,
    resume: { ...draftSet.resume, contentMd: revised.resumeMd },
    coverLetter: { contentMd: revised.coverLetterMd },
    reviewNotes: resolvedNotes,
    revisionHistory: [
      ...draftSet.revisionHistory,
      {
        at: nowIso,
        summary: `Revised after ${notes.length} review note(s)`,
        basedOnNotes: notes.length,
      },
    ],
  });
}