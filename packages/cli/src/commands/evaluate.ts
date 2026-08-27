/**
 * `jobsage evaluate` — run fit evaluation for a stored posting.
 * Loads the local profile and posting, wires engine deps, writes evaluation.
 */
import { join } from "node:path";
import type { Command } from "commander";
import {
  CandidateProfileSchema,
  JobPostingSchema,
  SchemaViolationError,
  evaluateFit,
  evaluateChineseFit,
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
} from "../workspace.js";

export function registerEvaluate(program: Command): void {
  program
    .command("evaluate")
    .description("Evaluate a stored posting against the candidate profile")
    .requiredOption("--posting <postingId>", "posting id returned by `posting add`")
    .option("--market <market>", "market overlay (e.g. china)")
    .option("--workspace <dir>", "workspace directory")
    .option("--provider <auto|mock|claude-agent-sdk|deepseek|qwen|glm|sensenova>", "LLM provider override")
    .option("--json", "machine-readable JSON output")
    .action(
      async (opts: { posting: string; market?: string; workspace?: string; provider?: string; json?: boolean }) => {
        const root = opts.workspace ?? defaultWorkspaceRoot();
        const ws = layout(root);
        await ensureLayout(ws);
        try {
          const profileRaw = await readJson<unknown>(join(ws.profileDir, "profile.json"));
          const profile = CandidateProfileSchema.parse(profileRaw);
          const postingRaw = await readJson<unknown>(
            join(ws.postingsDir, opts.posting, "posting.json"),
          );
          const posting = JobPostingSchema.parse(postingRaw);

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
          const evaluation = isChina
            ? await evaluateChineseFit({ profile, posting }, deps)
            : await evaluateFit({ profile, posting }, deps);

          await writeJson(
            join(ws.evaluationsDir, evaluation.id, "evaluation.json"),
            evaluation,
          );
          await appendAudit(ws, {
            at: evaluation.createdAt,
            action: "evaluate.run",
            detail: { evaluationId: evaluation.id, postingId: posting.id, market: isChina ? "china" : "global" },
          });
          printEnvelope(
            ok({
              evaluationId: evaluation.id,
              verdict: evaluation.overall.verdict,
              score: evaluation.overall.score,
              dimensionsCount: evaluation.dimensions.length,
              strengthsCount: evaluation.strengths.length,
              gapsCount: evaluation.gaps.length,
            }),
          );
        } catch (err) {
          if (err instanceof SchemaViolationError) {
            printEnvelope(fail(ExitCode.ENGINE, err.message));
            process.exitCode = ExitCode.ENGINE;
            return;
          }
          const message = err instanceof Error ? err.message : String(err);
          const isMissingFile = /ENOENT|profile.json|posting.json/.test(message);
          printEnvelope(
            fail(
              isMissingFile ? ExitCode.WORKSPACE : ExitCode.UNEXPECTED,
              `Evaluation failed: ${message}`,
            ),
          );
          process.exitCode = isMissingFile ? ExitCode.WORKSPACE : ExitCode.UNEXPECTED;
        }
      },
    );
}
