/**
 * Local workspace layout (research.md R7).
 * Filesystem-as-database: JSON per entity + audit log. No server, no DB.
 * Constitution Principle III: everything stays on the user's machine.
 */
import { mkdir, readFile, writeFile, appendFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join, dirname } from "node:path";

export interface WorkspacePaths {
  root: string;
  profileDir: string;
  postingsDir: string;
  evaluationsDir: string;
  applicationsDir: string;
  exportsDir: string;
  auditLog: string;
}

export function defaultWorkspaceRoot(): string {
  return process.env.JOBSAGE_WORKSPACE ?? join(homedir(), ".jobsage", "workspace");
}

export function layout(root: string): WorkspacePaths {
  return {
    root,
    profileDir: join(root, "profile"),
    postingsDir: join(root, "postings"),
    evaluationsDir: join(root, "evaluations"),
    applicationsDir: join(root, "applications"),
    exportsDir: join(root, "exports"),
    auditLog: join(root, "jobsage.log"),
  };
}

export async function ensureLayout(ws: WorkspacePaths): Promise<void> {
  await Promise.all(
    [
      ws.root,
      ws.profileDir,
      ws.postingsDir,
      ws.evaluationsDir,
      ws.applicationsDir,
      ws.exportsDir,
    ].map((dir) => mkdir(dir, { recursive: true })),
  );
}

export async function writeJson(filePath: string, value: unknown): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export async function writeTextFile(filePath: string, content: string): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, content, "utf8");
}

export async function readJson<T>(filePath: string): Promise<T> {
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw) as T;
}

export async function appendAudit(
  ws: WorkspacePaths,
  entry: { at: string; action: string; detail?: Record<string, unknown> },
): Promise<void> {
  await appendFile(ws.auditLog, `${JSON.stringify(entry)}\n`, "utf8");
}

export async function writeProfileFile(
  ws: WorkspacePaths,
  profile: unknown,
): Promise<string> {
  const p = join(ws.profileDir, "profile.json");
  await writeJson(p, profile);
  return p;
}
