/**
 * `jobsage posting add` — record a pasted job description verbatim.
 * P0 source is always "user-paste"; no scraping path exists (constitution
 * Principle VII).
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Command } from "commander";
import { JobPostingSchema, parseChineseJobPosting, type JobPosting } from "@jobsage/engine";
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
    .option("--market <market>", "market overlay (e.g. china)")
    .option("--workspace <dir>", "workspace directory")
    .option("--json", "machine-readable JSON output")
    .action(
      async (opts: { file?: string; stdin?: boolean; market?: string; workspace?: string; json?: boolean }) => {
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

          const isChina = opts.market === "china" || /[一-鿿]/.test(rawText);
          const id = `posting_${Date.now().toString(36)}`;
          let postingEntity: JobPosting;

          if (isChina) {
            postingEntity = parseChineseJobPosting(rawText, id);
          } else {
            postingEntity = {
              id,
              source: "user-paste",
              rawText,
              extracted: {
                language: "en",
              },
              keywords: [],
              createdAt: new Date().toISOString(),
            };
          }

          const parsed = JobPostingSchema.safeParse(postingEntity);
          if (!parsed.success) {
            throw new Error(`Invalid posting: ${parsed.error.message}`);
          }
          const dir = join(ws.postingsDir, parsed.data.id);
          await writeJson(join(dir, "posting.json"), parsed.data);
          await writeTextFile(join(dir, "raw.txt"), parsed.data.rawText);
          await appendAudit(ws, {
            at: parsed.data.createdAt,
            action: "posting.add",
            detail: { postingId: parsed.data.id, market: isChina ? "china" : "global" },
          });
          printEnvelope(
            ok({
              postingId: parsed.data.id,
              extracted: parsed.data.extracted,
              keywords: parsed.data.keywords,
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
