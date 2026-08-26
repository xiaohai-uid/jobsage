/**
 * `jobsage draft` — generate tailored resume + cover letter drafts from an
 * evaluation. Output is always a draft; no sending capability exists
 * (constitution Principle II).
 */
import { join } from "node:path";
import type { Command } from "commander";
import {
  CandidateProfileSchema,
  FitEvaluationSchema,
  JobPostingSchema,
  SchemaViolationError,
  draftApplication,
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

export function registerDraft(program: Command): void {
  program
    .command("draft")
    .description("Generate tailored resume and cover letter drafts")
    .requiredOption("--evaluation <evaluationId>", "evaluation id returned by evaluate")
    .option("--workspace <dir>", "workspace directory")
    .option("--provider <auto|mock|claude-agent-sdk>", "LLM provider override")
    .option("--json", "machine-readable JSON output")
    .action(
      async (opts: { evaluation: string; workspace?: string; provider?: string; json?: boolean }) => {
        const root = opts.workspace ?? defaultWorkspaceRoot();
        const ws = layout(root);
        await ensureLayout(ws);
        try {
          const profile = CandidateProfileSchema.parse(
            await readJson<unknown>(join(ws.profileDir, "profile.json")),
          );
          const evaluation = FitEvaluationSchema.parse(
            await readJson<unknown>(
              join(ws.evaluationsDir, opts.evaluation, "evaluation.json"),
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

          const draftSet = await draftApplication({ evaluation, profile, posting }, deps);
          const dir = join(ws.applicationsDir, draftSet.id);
          await writeJson(join(dir, "draft-set.json"), draftSet);
          await writeTextFile(join(dir, "resume.md"), draftSet.resume.contentMd);
          await writeTextFile(join(dir, "cover-letter.md"), draftSet.coverLetter.contentMd);
          await appendAudit(ws, {
            at: new Date().toISOString(),
            action: "draft.create",
            detail: {
              draftSetId: draftSet.id,
              evaluationId: evaluation.id,
              cutCount: draftSet.resume.cutLog.length,
            },
          });
          printEnvelope(
            ok({
              draftSetId: draftSet.id,
              resumeBullets: draftSet.resume.contentMd.split("\n").filter((l) => l.startsWith("- [ref:")).length,
              coverLetterWords: draftSet.coverLetter.contentMd.split(/\s+/).length,
              cutCount: draftSet.resume.cutLog.length,
              disclosureEnabled: draftSet.disclosure.enabled,
            }),
          );
        } catch (err) {
          if (err instanceof SchemaViolationError) {
            printEnvelope(fail(ExitCode.ENGINE, err.message));
            process.exitCode = ExitCode.ENGINE;
            return;
          }
          const message = err instanceof Error ? err.message : String(err);
          const isMissingFile = /ENOENT|profile.json|evaluation.json|posting.json/.test(message);
          printEnvelope(
            fail(
              isMissingFile ? ExitCode.WORKSPACE : ExitCode.UNEXPECTED,
              `Draft failed: ${message}`,
            ),
          );
          process.exitCode = isMissingFile ? ExitCode.WORKSPACE : ExitCode.UNEXPECTED;
        }
      },
    );
}
