/**
 * `jobsage init` — create the local candidate profile.
 * Reads YAML or JSON profile file (or interactively via prompts when no file
 * is given), validates against CandidateProfileSchema, writes profile.json.
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Command } from "commander";
import { parse as parseYaml } from "yaml";
import { CandidateProfileSchema, type CandidateProfile } from "@jobsage/engine";
import { ExitCode, fail, ok, printEnvelope } from "../io.js";
import {
  appendAudit,
  defaultWorkspaceRoot,
  ensureLayout,
  layout,
  writeProfileFile,
} from "../workspace.js";

async function loadProfileFromFile(filePath: string): Promise<CandidateProfile> {
  const raw = await readFile(filePath, "utf8");
  let data: unknown;
  if (filePath.endsWith(".json")) {
    data = JSON.parse(raw) as unknown;
  } else {
    data = parseYaml(raw);
  }
  const parsed = CandidateProfileSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error(`Invalid profile file: ${parsed.error.message}`);
  }
  return parsed.data;
}

export function registerInit(program: Command): void {
  program
    .command("init")
    .description("Create or import the local candidate profile")
    .option("--file <path>", "YAML/JSON profile file (interactive when omitted)")
    .option("--workspace <dir>", "workspace directory (default ~/.jobsage/workspace)")
    .option("--json", "machine-readable JSON output")
    .action(async (opts: { file?: string; workspace?: string; json?: boolean }) => {
      const root = opts.workspace ?? defaultWorkspaceRoot();
      const ws = layout(root);
      await ensureLayout(ws);
      try {
        let profile: CandidateProfile;
        if (opts.file) {
          profile = await loadProfileFromFile(opts.file);
        } else {
          // Minimal interactive flow for v0; structured file import is the
          // primary path (FR-1). Prompts stay simple and testable.
          const rl = (await import("node:readline/promises")).createInterface({
            input: process.stdin,
            output: process.stdout,
          });
          const name = (await rl.question("Name: ")).trim();
          const email = (await rl.question("Email: ")).trim();
          const skillsRaw = (await rl.question("Skills (comma-separated): ")).trim();
          rl.close();
          const candidate = {
            id: "profile",
            name,
            contact: { email },
            education: [],
            experiences: [],
            skills: skillsRaw.split(",").map((s) => s.trim()).filter(Boolean),
            portfolioLinks: [],
            locale: "en",
            version: 1,
          };
          const parsed = CandidateProfileSchema.safeParse(candidate);
          if (!parsed.success) {
            throw new Error(`Invalid interactive input: ${parsed.error.message}`);
          }
          profile = parsed.data;
        }
        await writeProfileFile(ws, profile);
        await appendAudit(ws, {
          at: new Date().toISOString(),
          action: "profile.init",
          detail: { version: profile.version },
        });
        printEnvelope(
          ok({
            profileId: profile.id,
            workspacePath: ws.root,
            profileVersion: profile.version,
          }),
        );
      } catch (err) {
        printEnvelope(
          fail(
            ExitCode.WORKSPACE,
            `Could not initialize profile: ${err instanceof Error ? err.message : String(err)}`,
          ),
        );
        process.exitCode = ExitCode.WORKSPACE;
      }
    });
}
