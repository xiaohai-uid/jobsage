/**
 * evaluateFit workflow — candidate profile + job posting → FitEvaluation.
 * Contract: specs/001-engine-core/contracts/engine-api.md
 *
 * Workflow-level validation: LLM output is parsed, wrapped with system-owned
 * fields (id/postingId/profileVersion/createdAt), and validated against
 * FitEvaluationSchema. One retry on schema violation, then hard failure
 * (research.md R5).
 */
import type { CandidateProfile, JobPosting } from "../domain/schemas.js";
import { FitEvaluationSchema } from "../domain/schemas.js";
import type { EngineDeps } from "../ports/index.js";
import { SchemaViolationError } from "../ports/index.js";
import { buildEvaluatePrompt } from "./prompts/evaluate.js";

export interface EvaluateInput {
  profile: CandidateProfile;
  posting: JobPosting;
}

function parseJsonLoose(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return JSON.parse(fenced ? fenced[1]! : trimmed) as unknown;
}

export async function evaluateFit(
  input: EvaluateInput,
  deps: EngineDeps,
): Promise<import("../domain/schemas.js").FitEvaluation> {
  const prompt = buildEvaluatePrompt(input);
  let lastError: unknown = null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const { text } = await deps.llm.generate(prompt);
    let candidate: unknown;
    try {
      candidate = parseJsonLoose(text);
      const full = {
        id: deps.ids.next(),
        postingId: input.posting.id,
        profileVersion: input.profile.version,
        createdAt: deps.clock.now().toISOString(),
        ...(candidate as Record<string, unknown>),
      };
      const parsed = FitEvaluationSchema.safeParse(full);
      if (parsed.success) return parsed.data;
      lastError = parsed.error;
    } catch (err) {
      lastError = err;
    }
  }

  throw new SchemaViolationError(
    `LLM output failed FitEvaluation schema validation after one retry: ${String(lastError)}`,
  );
}
