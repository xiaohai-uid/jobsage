/**
 * `jobsage review` — run the drafter-reviewer pipeline on a draft set.
 * `--revise` also produces a revised draft. Output remains a draft.
 */
import { join } from "node:path";
import type { Command } from "commander";
import {
  ApplicationDraftSetSchema,
  CandidateProfileSchema,
  FitEvaluationSchema,
  JobPostingSchema,
  SchemaViolationError,
  reviewAndRevise,
  reviewAndReviseChinese,
} from "@jobsage/engine";
import { buildDeps, providerApiKeyEnvVar } from "../deps.js";
import { ExitCode, fail, ok, printEnvelope } from "../io.js";
import {
  appendAudit,
  defaultWorkspaceRoot,
  ensureLayout,
  layout,
  readJson,
  writeJson,
  writeTextFile,
} from "../workspace.js";

export function registerReview(program: Command): void {
  program
    .command("review")
    .description("Review a draft set (isolated reviewer); --revise applies feedback")
    .requiredOption("--draft <draftSetId>", "draft set id returned by draft")
    .option("--revise", "also produce a revised draft")
    .option("--market <market>", "market overlay (e.g. china)")
    .option("--workspace <dir>", "workspace directory")
    .option("--provider <auto|mock|claude-agent-sdk|deepseek|qwen|glm|sensenova>", "LLM provider override")
    .option("--json", "machine-readable JSON output")
    .action(
      async (opts: { draft: string; revise?: boolean; market?: string; workspace?: string; provider?: string; json?: boolean }) => {
        const root = opts.workspace ?? defaultWorkspaceRoot();
        const ws = layout(root);
        await ensureLayout(ws);
        try {
          const profile = CandidateProfileSchema.parse(
            await readJson<unknown>(join(ws.profileDir, "profile.json")),
          );
          const draftSet = ApplicationDraftSetSchema.parse(
            await readJson<unknown>(
              join(ws.applicationsDir, opts.draft, "draft-set.json"),
            ),
          );
          const evaluation = FitEvaluationSchema.parse(
            await readJson<unknown>(
              join(ws.evaluationsDir, draftSet.evaluationId, "evaluation.json"),
            ),
          );
          const posting = JobPostingSchema.parse(
            await readJson<unknown>(
              join(ws.postingsDir, evaluation.postingId, "posting.json"),
            ),
          );

          const deps = buildDeps(opts.provider);
          const keyEnv = providerApiKeyEnvVar(
            deps.llm.constructor.name === "ClaudeAgentSdkLlmAdapter"
              ? "claude-agent-sdk"
              : (opts.provider ?? process.env.JOBSAGE_PROVIDER ?? "claude-agent-sdk"),
          );
          if (keyEnv && !process.env[keyEnv]) {
            printEnvelope(
              fail(
                ExitCode.CONFIG,
                `${keyEnv} is not set`,
                `export ${keyEnv}=sk-... or run with --provider mock`,
              ),
            );
            process.exitCode = ExitCode.CONFIG;
            return;
          }

          const isChina = opts.market === "china" || profile.locale === "zh" || posting.extracted.language === "zh";

          const updated = isChina
            ? await reviewAndReviseChinese(
                {
                  profile,
                  posting,
                  draftSet,
                  evaluation,
                  revise: opts.revise,
                },
                deps,
              )
            : await reviewAndRevise(
                {
                  profile,
                  posting,
                  draftSet,
                  mode: opts.revise ? "review-and-revise" : "review-only",
                },
                deps,
              );

          const dir = join(ws.applicationsDir, updated.id);
          await writeJson(join(dir, "draft-set.json"), updated);
          await writeTextFile(join(dir, "resume.md"), updated.resume.contentMd);
          await writeTextFile(join(dir, "cover-letter.md"), updated.coverLetter.contentMd);
          await appendAudit(ws, {
            at: new Date().toISOString(),
            action: "draft.review",
            detail: {
              draftSetId: updated.id,
              revised: Boolean(opts.revise),
              notesCount: updated.reviewNotes.length,
              market: isChina ? "china" : "global",
            },
          });
          printEnvelope(
            ok({
              draftSetId: updated.id,
              notesCount: updated.reviewNotes.length,
              revised: Boolean(opts.revise),
              revisionHistoryCount: updated.revisionHistory.length,
            }),
          );
        } catch (err) {
          if (err instanceof SchemaViolationError) {
            printEnvelope(fail(ExitCode.ENGINE, err.message));
            process.exitCode = ExitCode.ENGINE;
            return;
          }
          const message = err instanceof Error ? err.message : String(err);
          const isMissingFile = /ENOENT|profile.json|evaluation.json|posting.json|draft-set.json/.test(message);
          printEnvelope(
            fail(
              isMissingFile ? ExitCode.WORKSPACE : ExitCode.UNEXPECTED,
              `Review failed: ${message}`,
            ),
          );
          process.exitCode = isMissingFile ? ExitCode.WORKSPACE : ExitCode.UNEXPECTED;
        }
      },
    );
}
