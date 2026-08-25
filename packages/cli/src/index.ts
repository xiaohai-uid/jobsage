#!/usr/bin/env node
/**
 * jobsage CLI entry. Contract: specs/001-engine-core/contracts/cli-schema.md
 * Subcommands: init, posting add, evaluate (P0 US1); draft/review/export land
 * with their user stories.
 */
import { pathToFileURL } from "node:url";
import { Command, CommanderError } from "commander";
import { ENGINE_VERSION } from "@jobsage/engine";
import { registerDraft } from "./commands/draft.js";
import { registerEvaluate } from "./commands/evaluate.js";
import { registerInit } from "./commands/init.js";
import { registerPosting } from "./commands/posting.js";
import { registerReview } from "./commands/review.js";
import { ExitCode, fail, serializeEnvelope } from "./io.js";

export async function main(argv: string[]): Promise<number> {
  const program = new Command();
  program
    .name("jobsage")
    .description("JobSage (谋职) — local-first AI job application copilot")
    .version(ENGINE_VERSION);
  registerInit(program);
  registerPosting(program);
  registerEvaluate(program);
  registerDraft(program);
  registerReview(program);
  program.exitOverride();

  try {
    await program.parseAsync(argv, { from: "user" });
    const code = process.exitCode ?? ExitCode.OK;
    return typeof code === "number" ? code : ExitCode.UNEXPECTED;
  } catch (err) {
    if (err instanceof CommanderError) {
      if (err.exitCode === 0) return ExitCode.OK;
      console.error(serializeEnvelope(fail(ExitCode.USAGE, err.message)));
      return ExitCode.USAGE;
    }
    console.error(serializeEnvelope(fail(ExitCode.UNEXPECTED, String(err))));
    return ExitCode.UNEXPECTED;
  }
}

/** True when this module is the Node entry script (not an imported module). */
function isDirectRun(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return import.meta.url === pathToFileURL(entry).href;
  } catch {
    return false;
  }
}

if (isDirectRun()) {
  void main(process.argv.slice(2)).then((code) => {
    process.exitCode = code;
  });
}
