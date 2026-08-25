#!/usr/bin/env node
/**
 * jobsage CLI entry. Contract: specs/001-engine-core/contracts/cli-schema.md
 * Phase 1 placeholder — subcommands land with their user stories.
 */
import { pathToFileURL } from "node:url";
import { ENGINE_NAME, ENGINE_VERSION } from "@jobsage/engine";

export function main(argv: string[]): number {
  const first = argv[0] ?? "";
  if (first === "--version" || first === "-v") {
    console.log(`jobsage ${ENGINE_VERSION} (engine: ${ENGINE_NAME})`);
    return 0;
  }
  console.error("jobsage: no subcommand given. See README for usage.");
  return 1;
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
  process.exit(main(process.argv.slice(2)));
}
