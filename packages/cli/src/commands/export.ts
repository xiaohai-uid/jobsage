/**
 * `jobsage export` — explicit user-triggered export (constitution Principle II:
 * the only command that writes an external file, and only on explicit action).
 * PDF path uses a real Playwright renderer; HTML is an offline fallback.
 */
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Command } from "commander";
import {
  ApplicationDraftSetSchema,
  CandidateProfileSchema,
  PlaywrightPdfAdapter,
  RendererUnavailableError,
  renderDocument,
  renderPdf,
} from "@jobsage/engine";
import { buildDeps } from "../deps.js";
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

function contactLine(profile: { name: string; contact: { email: string; phone?: string; location?: string } }): string {
  return [profile.name, profile.contact.email, profile.contact.phone, profile.contact.location]
    .filter(Boolean)
    .join(" · ");
}

export function registerExport(program: Command): void {
  program
    .command("export")
    .description("Export a draft to PDF or HTML (explicit user action)")
    .requiredOption("--draft <draftSetId>", "draft set id returned by draft")
    .requiredOption("--format <pdf|html>", "export format")
    .requiredOption("--out <path>", "output file path")
    .option("--document <resume|cover-letter>", "which document to export", "resume")
    .option("--workspace <dir>", "workspace directory")
    .option("--provider <auto|mock|claude-agent-sdk>", "LLM provider override (unused for export)")
    .option("--json", "machine-readable JSON output")
    .action(
      async (opts: {
        draft: string;
        format: string;
        out: string;
        document?: string;
        workspace?: string;
        provider?: string;
        json?: boolean;
      }) => {
        const root = opts.workspace ?? defaultWorkspaceRoot();
        const ws = layout(root);
        await ensureLayout(ws);
        const document = opts.document === "cover-letter" ? "cover-letter" : "resume";
        try {
          const profile = CandidateProfileSchema.parse(
            await readJson<unknown>(join(ws.profileDir, "profile.json")),
          );
          const draftSet = ApplicationDraftSetSchema.parse(
            await readJson<unknown>(join(ws.applicationsDir, opts.draft, "draft-set.json")),
          );

          if (opts.format === "html") {
            const rendered = renderDocument({
              kind: document,
              title: document === "resume" ? profile.name : "Cover Letter",
              contactLine: contactLine(profile),
              bodyMd:
                document === "resume" ? draftSet.resume.contentMd : draftSet.coverLetter.contentMd,
              disclosureText: draftSet.disclosure.enabled ? draftSet.disclosure.text : "",
            });
            await writeTextFile(opts.out, rendered.html);
            await appendAudit(ws, {
              at: new Date().toISOString(),
              action: "export.html",
              detail: { draftSetId: draftSet.id, document, path: opts.out },
            });
            printEnvelope(ok({ path: opts.out, format: "html", document }));
            return;
          }

          if (opts.format === "pdf") {
            const deps = buildDeps(opts.provider, { pdfRenderer: new PlaywrightPdfAdapter() });
            const bytes = await renderPdf({ draftSet, profile, document }, deps);
            await writeFile(opts.out, bytes);
            const exportedAt = new Date().toISOString();
            const updated = {
              ...draftSet,
              exports: [
                ...draftSet.exports,
                { type: "pdf" as const, path: opts.out, exportedAt },
              ],
            };
            await writeJson(join(ws.applicationsDir, draftSet.id, "draft-set.json"), updated);
            await appendAudit(ws, {
              at: exportedAt,
              action: "export.pdf",
              detail: { draftSetId: draftSet.id, document, path: opts.out, bytes: bytes.length },
            });
            printEnvelope(ok({ path: opts.out, format: "pdf", document, bytes: bytes.length }));
            return;
          }

          printEnvelope(fail(ExitCode.USAGE, `Unsupported format: ${opts.format} (use pdf or html)`));
          process.exitCode = ExitCode.USAGE;
        } catch (err) {
          if (err instanceof RendererUnavailableError) {
            printEnvelope(
              fail(ExitCode.ENGINE, err.message, "Install a Chromium browser for Playwright, or use --format html"),
            );
            process.exitCode = ExitCode.ENGINE;
            return;
          }
          const message = err instanceof Error ? err.message : String(err);
          const isMissingFile = /ENOENT|profile.json|draft-set.json/.test(message);
          printEnvelope(
            fail(
              isMissingFile ? ExitCode.WORKSPACE : ExitCode.UNEXPECTED,
              `Export failed: ${message}`,
            ),
          );
          process.exitCode = isMissingFile ? ExitCode.WORKSPACE : ExitCode.UNEXPECTED;
        }
      },
    );
}