/**
 * App state reducer — pure state transitions for the JobSage desktop shell.
 * Contract: specs/002-desktop-shell/contracts/ui-state.md
 * Invariants: one pending command at a time; no send/submit actions exist.
 */

export interface AppSettings {
  workspacePath: string;
  provider: "auto" | "mock" | "claude-agent-sdk";
}

export interface WorkspaceIndex {
  profile: { name: string; version: number } | null;
  postings: Array<{ id: string; roleTitle?: string; createdAt: string }>;
  evaluations: Array<{ id: string; verdict: string; score: number; createdAt: string }>;
  applications: Array<{ id: string; createdAt: string }>;
}

export interface DraftEditorState {
  draftSetId: string;
  resumeMd: string;
  coverLetterMd: string;
  cutLog: Array<{ removedLine: string; reason: string }>;
  disclosure: { enabled: boolean; text: string };
}

export interface CommandResult {
  ok: boolean;
  data?: unknown;
  error?: { code: string; message: string; hint?: string };
}

export interface AppState {
  settings: AppSettings;
  workspace: WorkspaceIndex;
  screen: { kind: "profile" | "jd" | "draft" | "settings"; draftSetId?: string };
  pending: { command: string; startedAt: string } | null;
  lastResult: CommandResult | null;
  draft: DraftEditorState | null;
}

export type Action =
  | { type: "settings.loaded"; settings: AppSettings }
  | { type: "command.started"; command: string; startedAt: string }
  | { type: "command.succeeded"; result: CommandResult }
  | { type: "command.failed"; code: string; message: string; hint?: string }
  | { type: "workspace.indexed"; workspace: WorkspaceIndex }
  | { type: "screen.changed"; screen: AppState["screen"] }
  | { type: "draft.loaded"; draft: DraftEditorState }
  | { type: "draft.edited"; field: "resumeMd" | "coverLetterMd"; content: string }
  | { type: "draft.saved"; draft: DraftEditorState };

export const ACTION_TYPES = [
  "settings.loaded",
  "command.started",
  "command.succeeded",
  "command.failed",
  "workspace.indexed",
  "screen.changed",
  "draft.loaded",
  "draft.edited",
  "draft.saved",
] as const;

export const initialState: AppState = {
  settings: { workspacePath: "", provider: "auto" },
  workspace: { profile: null, postings: [], evaluations: [], applications: [] },
  screen: { kind: "settings" },
  pending: null,
  lastResult: null,
  draft: null,
};

export function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "settings.loaded":
      return { ...state, settings: action.settings };
    case "command.started":
      if (state.pending) return state; // FR-9: single command only
      return {
        ...state,
        pending: { command: action.command, startedAt: action.startedAt },
      };
    case "command.succeeded":
      return { ...state, pending: null, lastResult: action.result };
    case "command.failed":
      return {
        ...state,
        pending: null,
        lastResult: {
          ok: false,
          error: { code: action.code, message: action.message, hint: action.hint },
        },
      };
    case "workspace.indexed":
      return { ...state, workspace: action.workspace };
    case "screen.changed":
      return { ...state, screen: action.screen };
    case "draft.loaded":
      return { ...state, draft: action.draft };
    case "draft.edited": {
      if (!state.draft) return state;
      return {
        ...state,
        draft:
          action.field === "resumeMd"
            ? { ...state.draft, resumeMd: action.content }
            : { ...state.draft, coverLetterMd: action.content },
      };
    }
    case "draft.saved":
      return { ...state, draft: action.draft };
    default:
      return state;
  }
}