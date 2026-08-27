/**
 * Domain types for JobSage. These mirror the data shapes persisted to
 * localStorage by the accepted prototype (jobsage-desktop.html) so that an
 * existing user state survives the migration unchanged.
 */

export type ViewId = 'profile' | 'evaluate' | 'draft' | 'export' | 'settings';
export type ProviderId = 'mock' | 'claude-agent-sdk' | 'auto' | 'deepseek' | 'qwen' | 'glm' | 'sensenova';
export type ModalId = 'folder' | 'create' | 'import' | 'switch' | null;
export type ExportFormat = 'PDF' | 'HTML';
export type EvaluateStatus = 'idle' | 'running' | 'done';
export type Verdict = 'strong' | 'ok' | 'weak';

export interface ExperienceEntry {
  role: string;
  company: string;
  years: string;
  highlights: string;
}

export interface EducationEntry {
  school: string;
  degree: string;
  years: string;
}

export interface ProfileData {
  name: string;
  email: string;
  headline: string;
  location: string;
  version: number;
  savedAt: string;
  lastImport: string;
  experience: ExperienceEntry[];
  education: EducationEntry[];
  skills: string[];
}

export interface DimensionScore {
  id: string;
  label: string;
  score: number;
}

export interface EvaluationResult {
  /** Machine key used to pick the verdict pill tone. */
  verdict: Verdict;
  /** Human label, e.g. "Strong match". */
  verdictLabel: string;
  score: number;
  dims: DimensionScore[];
  strengths: string[];
  gaps: string[];
  reco: string;
}

export interface JobPostingState {
  text: string;
  status: EvaluateStatus;
  result: EvaluationResult | null;
  /** Real engine evaluation id (P1 sidecar wiring). */
  evaluationId: string | null;
}

export interface CutItem {
  id: number;
  target: 'resume' | 'cover';
  item: string;
  reason: string;
  restored: boolean;
}

export interface DraftData {
  resume: string;
  cover: string;
  disclosure: boolean;
  savedAt: string;
  cutLog: CutItem[];
  /** Real engine draft-set id (P1 sidecar wiring). */
  draftSetId: string | null;
}

export interface ExportRow {
  id: number;
  format: ExportFormat;
  file: string;
  size: string;
  time: string;
  disclosure: boolean;
}

export interface RecentWorkspace {
  path: string;
  last: string;
}

/**
 * The complete persisted application state. One object, written to
 * localStorage on every change (same contract as the prototype).
 */
export interface AppData {
  view: ViewId;
  workspace: string | null;
  recents: RecentWorkspace[];
  provider: ProviderId;
  exportFmt: ExportFormat;
  exporting: boolean;
  profile: ProfileData;
  jd: JobPostingState;
  drafts: DraftData;
  exports: ExportRow[];
}

export interface ToastItem {
  id: number;
  msg: string;
  type: 'ok' | 'info';
}

/** All imperative levers a view may pull. Views stay presentational. */
export interface AppActions {
  navigate(view: ViewId): void;
  openModal(modal: ModalId): void;
  closeModal(): void;
  /** Shallow top-level patch over the current state. */
  update(patch: Partial<AppData>): void;
  toast(msg: string, type?: ToastItem['type']): void;
  setWorkspace(path: string): void;
  /** Runs the (mock) local evaluation pipeline for the pasted JD. */
  evaluate(): void;
  saveProfile(): void;
  importProfile(text: string): void;
  saveDrafts(): void;
  restoreItem(item: CutItem): void;
  exportDrafts(): void;
}

export interface ViewProps {
  data: AppData;
  actions: AppActions;
}

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

/**
 * Component props. Kept deliberately small — only the seams that make the
 * component embeddable: where to start, what data to inject, and whether to
 * persist at all.
 */
export interface JobSageAppProps {
  /** Screen shown when no persisted state exists yet. Default `evaluate`. */
  initialView?: ViewId;
  /** Deep-merged over the seeded demo data; wins over persisted state. */
  initialData?: DeepPartial<AppData>;
  /**
   * localStorage key for state persistence. Pass `null` to disable
   * persistence entirely (stateless embed). Default `jobsage:demo:v1`.
   */
  persistKey?: string | null;
}