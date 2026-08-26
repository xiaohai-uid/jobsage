/**
 * Tauri bridge — React UI → JobSage CLI sidecar.
 * Contract: specs/002-desktop-shell/contracts/sidecar-protocol.md
 * The command whitelist is enforced in Rust; this module only builds argv.
 */
import { invoke } from "@tauri-apps/api/core";

export interface AppSettings {
  workspacePath: string;
  provider: "auto" | "mock" | "claude-agent-sdk" | "deepseek" | "qwen" | "glm";
}

export interface CliEnvelope<T = unknown> {
  schemaVersion: number;
  ok: boolean;
  data?: T;
  error?: { code: string; message: string; hint?: string };
}

export async function runCli(
  args: string[],
  opts?: { workspace?: string; stdin?: string },
): Promise<CliEnvelope> {
  return (await invoke("run_jobsage", {
    args,
    workspace: opts?.workspace ?? null,
    stdin: opts?.stdin ?? null,
  })) as CliEnvelope;
}

export async function getSettings(): Promise<AppSettings> {
  return (await invoke("get_settings")) as AppSettings;
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await invoke("save_settings", { settings });
}

export async function readWorkspaceFile(relative: string): Promise<string> {
  return (await invoke("read_workspace_file", { relative })) as string;
}

export async function writeWorkspaceFile(relative: string, content: string): Promise<string> {
  return (await invoke("write_workspace_file", { relative, content })) as string;
}

/* ---------- Pure argv builders (unit-testable, no Tauri runtime) ---------- */

export function buildInitArgs(profilePath: string, workspace: string): string[] {
  return ["init", "--file", profilePath, "--workspace", workspace, "--json"];
}

export function buildPostingAddStdioArgs(workspace: string): string[] {
  return ["posting", "add", "--stdin", "--workspace", workspace, "--json"];
}

export function buildEvaluateArgs(postingId: string, workspace: string, provider: string): string[] {
  return ["evaluate", "--posting", postingId, "--workspace", workspace, "--provider", provider, "--json"];
}

export function buildDraftArgs(evaluationId: string, workspace: string, provider: string): string[] {
  return ["draft", "--evaluation", evaluationId, "--workspace", workspace, "--provider", provider, "--json"];
}

export function buildReviewArgs(draftSetId: string, workspace: string, provider: string, revise = false): string[] {
  return [
    "review",
    "--draft",
    draftSetId,
    ...(revise ? ["--revise"] : []),
    "--workspace",
    workspace,
    "--provider",
    provider,
    "--json",
  ];
}

export function buildExportArgs(
  draftSetId: string,
  format: "pdf" | "html",
  outPath: string,
  document: "resume" | "cover-letter",
  workspace: string,
): string[] {
  return [
    "export",
    "--draft",
    draftSetId,
    "--format",
    format,
    "--out",
    outPath,
    "--document",
    document,
    "--workspace",
    workspace,
    "--json",
  ];
}