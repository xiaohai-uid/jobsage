/**
 * `jobsage posting add` — record a pasted job description verbatim.
 * P0 source is always "user-paste"; no scraping path exists (constitution
 * Principle VII).
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Command } from "commander";
import { JobPostingSchema, type JobPosting } from "@jobsage/engine";
import { ExitCode, fail, ok, printEnvelope } from "../io.js";
import {
  appendAudit,
  defaultWorkspaceRoot,
  ensureLayout,
  layout,
  writeJson,
  writeTextFile,
} from "../workspace.js";

export function registerPosting(program: Command): void {
  const posting = program.command("posting").description("Manage job postings (P0: user-paste only)");
  posting
    .command("add")
    .description("Add a job description from a file or stdin (user-paste only)")
    .option("--file <path>", "read posting text from a file")
    .option("--stdin", "read posting text from stdin")
    .option("--workspace <dir>", "workspace directory")
    .option("--json", "machine-readable JSON output")
    .action(
      async (opts: { file?: string; stdin?: boolean; workspace?: string; json?: boolean }) => {
        const root = opts.workspace ?? defaultWorkspaceRoot();
        const ws = layout(root);
        await ensureLayout(ws);
        try {
          let rawText = "";
          if (opts.file) {
            rawText = (await readFile(opts.file, "utf8")).trim();
          } else if (opts.stdin) {
            const chunks: Buffer[] = [];
            for await (const chunk of process.stdin) {
              chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            }
            rawText = Buffer.concat(chunks).toString("utf8").trim();
          } else {
            throw new Error("Provide --file <path> or --stdin");
          }
          if (!rawText) throw new Error("Posting text is empty");

          const posting: JobPosting = {
            id: `posting_${Date.now().toString(36)}`,
            source: "user-paste",
            rawText,
            extracted: {
              language: /[\u4e00-\u9fff]/.test(rawText) ? "zh" : "en",
            },
            keywords: [],
            createdAt: new Date().toISOString(),
          };
          const parsed = JobPostingSchema.safeParse(posting);
          if (!parsed.success) {
            throw new Error(`Invalid posting: ${parsed.error.message}`);
          }
          const dir = join(ws.postingsDir, parsed.data.id);
          await writeJson(join(dir, "posting.json"), parsed.data);
          await writeTextFile(join(dir, "raw.txt"), parsed.data.rawText);
          await appendAudit(ws, {
            at: parsed.data.createdAt,
            action: "posting.add",
            detail: { postingId: parsed.data.id },
          });
          printEnvelope(
            ok({
              postingId: parsed.data.id,
              extracted: parsed.data.extracted,
              keywordCount: parsed.data.keywords.length,
            }),
          );
        } catch (err) {
          printEnvelope(
            fail(
              ExitCode.WORKSPACE,
              `Could not add posting: ${err instanceof Error ? err.message : String(err)}`,
            ),
          );
          process.exitCode = ExitCode.WORKSPACE;
        }
      },
    );
}
