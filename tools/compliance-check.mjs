#!/usr/bin/env node
/**
 * Compliance self-check (T039, constitution principles II/III/VI/VII).
 *
 * Rules:
 *  1. No generic network transport imports/calls in the engine outside the
 *     whitelisted provider adapter (model inference is the only network edge).
 *  2. Engine public envelope must not expose send/submit/publish verbs.
 *  3. Distribution files must exist: LICENSE with upstream copyright line,
 *     NOTICE naming the upstream project.
 */
import { readFile } from "node:fs/promises";
import { glob } from "node:fs/promises";

export const TRANSPORT_PATTERNS = [
  { name: "fetch", pattern: /\bfetch\s*\(/ },
  { name: "axios", pattern: /\baxios\b/ },
  { name: "undici", pattern: /\bundici\b/ },
  { name: "node-fetch", pattern: /node-fetch/ },
  { name: "nodemailer", pattern: /nodemailer/ },
  { name: "smtp", pattern: /\bsmtp\b/i },
  { name: "sendgrid", pattern: /sendgrid/i },
  { name: "mailgun", pattern: /mailgun/i },
  { name: "webhook", pattern: /webhook/i },
  // The Agent SDK is a network runtime; its import may appear ONLY in the
  // whitelisted model-inference adapter (constitution Principle III/IV).
  { name: "claude-agent-sdk", pattern: /from\s*['"]@anthropic-ai\// },
];

// Model inference adapter is the intentional network edge; everything else
// must be offline (constitution Principle III/IV).
const NETWORK_WHITELIST = new Set([
  "packages/engine/src/adapters/claude-agent-sdk.ts",
]);

export function findForbiddenTransports(source, filePath) {
  if (NETWORK_WHITELIST.has(filePath)) return [];
  const found = [];
  for (const item of TRANSPORT_PATTERNS) {
    if (item.pattern.test(source)) found.push(item.name);
  }
  return found;
}

export function findSendLikeExports(source) {
  const matches = source.match(/export\s+(?:async\s+)?function\s+(\w+)/g) ?? [];
  const names = matches.map((m) =>
    m.replace(/export\s+(?:async\s+)?function\s+/, "").replace(/\(.*$/, ""),
  );
  return names.filter((n) => /\b(send|submit|publish|post|notify)(?=[A-Z_])/i.test(n));
}

async function main() {
  let violations = 0;

  // 1. Engine source transport scan
  for await (const file of glob("packages/engine/src/**/*.ts")) {
    const normalized = file.replaceAll("\\", "/");
    const source = await readFile(normalized, "utf8");
    const found = findForbiddenTransports(source, normalized);
    if (found.length > 0) {
      violations += 1;
      console.error(`FAIL transport scan ${normalized}: ${found.join(", ")}`);
    }
  }

  // 2. Engine index public surface
  const index = await readFile("packages/engine/src/index.ts", "utf8");
  const sendLike = findSendLikeExports(index);
  if (sendLike.length > 0) {
    violations += 1;
    console.error(`FAIL send-like export in engine index: ${sendLike.join(", ")}`);
  }

  // 3. Distribution files
  try {
    const license = await readFile("LICENSE", "utf8");
    if (!license.includes("Copyright (c) 2026 Mads Lorentzen")) {
      violations += 1;
      console.error("FAIL LICENSE missing upstream copyright line");
    }
  } catch {
    violations += 1;
    console.error("FAIL LICENSE file missing");
  }
  try {
    const notice = await readFile("NOTICE", "utf8");
    if (!notice.includes("MadsLorentzen/ai-job-search")) {
      violations += 1;
      console.error("FAIL NOTICE missing upstream project name");
    }
  } catch {
    violations += 1;
    console.error("FAIL NOTICE file missing");
  }

  if (violations === 0) {
    console.log("compliance OK");
    return 0;
  }
  console.error(`compliance FAILED (${violations} issue(s))`);
  return 1;
}

const isDirect = process.argv[1]?.endsWith("compliance-check.mjs");
if (isDirect) {
  process.exitCode = await main();
}

export { main as runComplianceCheck };